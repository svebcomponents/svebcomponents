import type {
  InferredSvelteOptionProps,
  InterfaceDeclaration,
  PrimitiveType,
  TypedVariableDeclarator,
} from "./types";

const enhanceInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  propName: string,
  attributeName?: string,
  type?: PrimitiveType,
  isReflected?: boolean,
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

export const inferPropsFromTypes = (
  propsDeclaration: TypedVariableDeclarator,
  typeDeclarations: InterfaceDeclaration[],
  // WARNING: this object is being mutated
  inferredProps: InferredSvelteOptionProps,
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
          // TODO: figure out how to best handle a reference here
          console.log("mutate with string");
          enhanceInferredProps(
            inferredProps,
            propName,
            // TODO: kebabize
            undefined,
            "string",
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
