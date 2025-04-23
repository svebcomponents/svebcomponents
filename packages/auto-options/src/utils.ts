import type { AST } from "svelte/compiler";
import type {
  InferredSvelteOptionProps,
  InterfaceDeclaration,
  PrimitiveType,
  TypedVariableDeclarator,
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

export const inferPropsFromTypes = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator,
  typeDeclarations: InterfaceDeclaration[],
) => {
  // if there are no types we bail early
  if (!("typeAnnotation" in propsDeclaration.id)) {
    return;
  }
  const { typeAnnotation: propsAnnotation } =
    propsDeclaration.id.typeAnnotation;
  if (
    propsAnnotation.type === "TSTypeReference" &&
    propsAnnotation.typeName.type === "Identifier"
  ) {
    const resolvedType = typeDeclarations.find(
      (typeDeclaration) =>
        typeDeclaration.id.name === propsAnnotation.typeName.name,
    );

    const typedProps = resolvedType?.body.body;
    // if we could not find any typed props, so be it!
    if (!typedProps) {
      return;
    }

    for (const { typeAnnotation, key } of typedProps) {
      const type = typeAnnotation.typeAnnotation.type;
      const propName = key.name;
      switch (type) {
        case "TSStringKeyword":
          enhanceInferredProps(
            inferredProps,
            propName,
            kebabize(propName),
            "String",
          );
          break;
        case "TSTypeReference":
          // TODO: figure out how to best handle a reference here
          console.log("do a little recursive dance?");
          break;
        default:
          // TODO: at some point the switch statement should be exhaustive
          console.log("found unhandeled type:", type);
      }
    }
  }
};

export const inferPropsFromComponentPropDeclaration = (
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator,
) => {
  TODO("infer props from destructuring", inferredProps, propsDeclaration);
};
