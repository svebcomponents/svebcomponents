import type { AST } from "svelte/compiler";
import type {
  InferredSvelteOptionProps,
  InterfaceDeclaration,
  PrimitiveType,
  TypedVariableDeclarator,
  Type,
  TypeDeclaration,
} from "./types";
import { kebabize, TODO } from "@svebcomponents/utils";

const enhanceInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  propName: string,
  attributeName?: string,
  // if the type is omitted, we assume it's a string, because that's the type attribute values have by default
  type: PrimitiveType = "String",
  // attributes are reflected by default
  isReflected: boolean = true,
) => {
  // first we check if the propName is already in the inferred props
  const previouslyInferredProp = inferredProps[propName];
  // if not, we insert what we inferred as isReflected
  if (!previouslyInferredProp) {
    inferredProps[propName] = {
      attributeName,
      type,
      isReflected,
    };
  }
};

export const inferPropsFromSvelteOptions = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  // TODO: write a type to make this a bit stricter
  customElementOptions?: AST.Attribute,
) => {
  TODO("infer props from svelte options", inferredProps);
};

const resolvePrimitiveType = (
  type: Type,
  typeDeclarations: TypeDeclaration[],
): PrimitiveType | null => {
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
    case "TSTypeReference":
      // handle builtin types
      if (type.typeName.name === "Record") {
        return "Object";
      }
      if (type.typeName.name === "Array") {
        return "Array";
      }
      // TODO: figure out how to best handle a reference here
      const resolvedTypeDeclaration = typeDeclarations.find(
        (typeDeclaration): typeDeclaration is TypeDeclaration => {
          if (!("id" in typeDeclaration)) return false;
          return typeDeclaration.id.name === type.typeName.name;
        },
      );
      if (!resolvedTypeDeclaration) return null;
      if (resolvedTypeDeclaration?.type === "TSInterfaceDeclaration") {
        return "Object";
      }
      return resolvePrimitiveType(
        resolvedTypeDeclaration.typeAnnotation,
        typeDeclarations,
      );
    default:
      // TODO: at some point the switch statement should be exhaustive
      console.log(
        "found unhandled type while trying to resolve primitive type: ",
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
          console.log(
            "@svebcomponents/auto-options could not resolve prop types since they were not of expected shape",
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
    const resolvedPrimitiveType = resolvePrimitiveType(
      typeAnnotation.typeAnnotation,
      typeDeclarations,
    );
    const propName = key.name;
    enhanceInferredProps(
      inferredProps,
      propName,
      kebabize(propName),
      resolvedPrimitiveType ?? "String",
    );
  }
};

export const inferPropsFromComponentPropDeclaration = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator,
) => {
  TODO("infer props from destructuring");
};
