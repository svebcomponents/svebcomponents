import type {
  InferredSvelteOptionProps,
  InterfaceDeclaration,
  PrimitiveType,
  TypedVariableDeclarator,
  Type,
  TypeDeclaration,
} from "./types";
import { kebabize } from "@svebcomponents/utils";
import type { SvelteOptions } from "./extractSvelteOptionsProps";

const WARNING_PREFIX = "[svebcomponents/auto-options]";

// marker for prop types that cannot be (de)serialized to an attribute value (functions, snippets)
const NON_SERIALIZABLE = "NonSerializable";

type ResolvedPropType = PrimitiveType | typeof NON_SERIALIZABLE;

const primitiveTypes = {
  String: "String",
  Array: "Array",
  Number: "Number",
  Boolean: "Boolean",
  Object: "Object",
} as const satisfies Record<PrimitiveType, PrimitiveType>;

const isPrimitiveType = (type: string): type is PrimitiveType => {
  return type in primitiveTypes;
};

// Only scalar props are reflected to attributes by default. Reflecting
// `Object`/`Array` props serializes the whole value into an attribute on
// every change — an anti-pattern (and, for large values, ruinous). Callers
// pass `isReflected: false` for props whose type couldn't be resolved, since
// an unresolved (typically imported) type is almost never a plain scalar.
const isReflectableByDefault = (type: PrimitiveType): boolean =>
  type === "String" || type === "Number" || type === "Boolean";

const enhanceInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  propName: string,
  attributeName?: string,
  // if the type is omitted, we assume it's a string, because that's the type attribute values have by default
  type: PrimitiveType = "String",
  // scalars reflect by default; objects/arrays/unresolved types do not
  isReflected: boolean = isReflectableByDefault(type),
) => {
  // first we check if the propName is already in the inferred props
  const previouslyInferredProp = inferredProps[propName];
  // props already known to be non-serializable (functions, snippets) never get attribute metadata
  if (previouslyInferredProp?.isNonSerializable) return;
  // and then update the previously inferred props, trying to not overwrite previous (more valuable) information
  // if no attribute name could be inferred from anywhere, fall back to the kebab-cased prop name,
  // matching Svelte's own default attribute naming behavior
  inferredProps[propName] = {
    attributeName:
      previouslyInferredProp?.attributeName ??
      attributeName ??
      kebabize(propName),
    type: previouslyInferredProp?.type ?? type,
    isReflected: previouslyInferredProp?.isReflected ?? isReflected,
  };
};

export const inferPropsFromSvelteOptions = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  svelteOptions: SvelteOptions | null,
) => {
  const propValues = svelteOptions?.customElementOptions?.props?.propValues;
  if (!propValues) return;
  for (const [propName, propValue] of Object.entries(propValues)) {
    const attributeName =
      "attribute" in propValue && typeof propValue["attribute"] === "string"
        ? propValue["attribute"]
        : undefined;
    const type =
      "type" in propValue &&
      typeof propValue["type"] === "string" &&
      isPrimitiveType(propValue["type"])
        ? propValue["type"]
        : undefined;
    const isReflected =
      "reflect" in propValue && typeof propValue["reflect"] === "boolean"
        ? propValue["reflect"]
        : undefined;
    enhanceInferredProps(
      inferredProps,
      propName,
      attributeName,
      type,
      isReflected,
    );
  }
};

const resolvePrimitiveType = (
  type: Type,
  typeDeclarations: TypeDeclaration[],
): ResolvedPropType | null => {
  // there are way to many ways to write simple types in TS.. T.T
  switch (type.type) {
    case "TSStringKeyword":
      return "String";
    case "TSNumberKeyword":
      return "Number";
    case "TSBooleanKeyword":
      return "Boolean";
    case "TSArrayType":
      return "Array";
    case "TSLiteralType":
      switch (typeof type.literal?.value) {
        case "string":
          return "String";
        case "number":
          return "Number";
        case "boolean":
          return "Boolean";
      }
      return "String";
    case "TSTypeLiteral":
      return "Object";
    case "TSTypeReference": {
      // handle builtin types
      if (type.typeName.name === "Record") {
        return "Object";
      }
      if (type.typeName.name === "Array") {
        return "Array";
      }
      const resolvedTypeDeclaration = typeDeclarations.find(
        (typeDeclaration): typeDeclaration is TypeDeclaration => {
          if (!("id" in typeDeclaration)) return false;
          return typeDeclaration.id.name === type.typeName.name;
        },
      );
      if (!resolvedTypeDeclaration) {
        // `Snippet` props (imported from "svelte") are render functions & cannot be expressed as attributes
        if (type.typeName.name === "Snippet") {
          return NON_SERIALIZABLE;
        }
        return null;
      }
      if (resolvedTypeDeclaration?.type === "TSInterfaceDeclaration") {
        return "Object";
      }
      return resolvePrimitiveType(
        resolvedTypeDeclaration.typeAnnotation,
        typeDeclarations,
      );
    }
    case "TSUnionType": {
      const resolvedMemberTypes = new Set<ResolvedPropType>();
      for (const member of type.types) {
        // `null` / `undefined` union members carry no type information for attribute handling,
        // idiomatic unions like `string | null` should simply resolve to their meaningful member
        if (
          member.type === "TSNullKeyword" ||
          member.type === "TSUndefinedKeyword"
        ) {
          continue;
        }
        const resolvedMemberType = resolvePrimitiveType(
          member,
          typeDeclarations,
        );
        if (resolvedMemberType === null) continue;
        resolvedMemberTypes.add(resolvedMemberType);
      }
      const [firstResolvedMemberType] = resolvedMemberTypes;
      // a union without resolvable meaningful members (e.g. `null | undefined`) tells us nothing
      if (firstResolvedMemberType === undefined) return null;
      // if all meaningful members resolve to the same type (e.g. `string | null` or `"a" | "b"`), use it
      if (resolvedMemberTypes.size === 1) return firstResolvedMemberType;
      console.warn(
        `${WARNING_PREFIX} cannot infer a single attribute type for a union mixing [${[...resolvedMemberTypes].join(", ")}], falling back to "String". Specify the type explicitly via <svelte:options customElement={{ props }} /> to override.`,
      );
      return "String";
    }
    case "TSFunctionType":
      return NON_SERIALIZABLE;
    case "TSNullKeyword":
    case "TSUndefinedKeyword":
      // these carry no type information for attribute handling
      return null;
    default:
      // at some point the switch statement should be exhaustive & this log never trigger
      console.warn(
        `${WARNING_PREFIX} found unhandled type while trying to resolve primitive type:`,
        type,
      );
      return null;
  }
};

export const inferPropsFromTypes = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator,
  typeDeclarations: TypeDeclaration[],
) => {
  // if there are no types we bail early
  if (!("typeAnnotation" in propsDeclaration.id)) {
    return;
  }
  const { typeAnnotation: propsAnnotation } =
    propsDeclaration.id.typeAnnotation;
  let typedProps: InterfaceDeclaration["body"]["body"] | undefined;

  if (
    propsAnnotation.type === "TSTypeReference" &&
    propsAnnotation.typeName.type === "Identifier"
  ) {
    const resolvedTypeDeclaration = typeDeclarations.find(
      (typeDeclaration): typeDeclaration is TypeDeclaration => {
        if (!("id" in typeDeclaration)) return false;
        return typeDeclaration.id.name === propsAnnotation.typeName.name;
      },
    );
    switch (resolvedTypeDeclaration?.type) {
      case "TSTypeAliasDeclaration":
        if (resolvedTypeDeclaration?.typeAnnotation.type !== "TSTypeLiteral") {
          console.warn(
            `${WARNING_PREFIX} could not resolve prop types since they were not of expected shape`,
          );
          return;
        }
        typedProps = resolvedTypeDeclaration.typeAnnotation.members;
        break;
      case "TSInterfaceDeclaration":
        typedProps = resolvedTypeDeclaration?.body.body;
        break;
      default:
        return;
    }
  }

  if (propsAnnotation.type === "TSTypeLiteral") {
    typedProps = propsAnnotation.members;
  }

  // if we could not find any typed props, so be it!
  if (!typedProps) {
    return;
  }

  for (const { typeAnnotation, key } of typedProps) {
    const resolvedPropType = resolvePrimitiveType(
      typeAnnotation.typeAnnotation,
      typeDeclarations,
    );
    const propName = key.name;
    if (resolvedPropType === NON_SERIALIZABLE) {
      // function / snippet props cannot be reflected to or parsed from attributes;
      // by omitting them from the generated custom element props, svelte exposes them
      // as plain JS properties without any attribute handling.
      // we still respect explicit user configuration from <svelte:options> if present.
      inferredProps[propName] ??= { isNonSerializable: true };
      continue;
    }
    enhanceInferredProps(
      inferredProps,
      propName,
      kebabize(propName),
      resolvedPropType ?? "String",
      // an unresolved type reference (e.g. an imported interface) falls back
      // to the `String` converter, but must not reflect — it is almost always
      // a complex value, not a scalar meant for an attribute.
      resolvedPropType === null ? false : undefined,
    );
  }
};

export const inferPropsFromComponentPropDeclaration = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator,
) => {
  const pattern = propsDeclaration.id;
  if (pattern.type !== "ObjectPattern") return;
  for (const property of pattern.properties) {
    if (property.type !== "Property" || !("name" in property.key)) continue;
    const propName = property.key.name;
    enhanceInferredProps(inferredProps, propName, kebabize(propName));
  }
};
