import type { VariableDeclarator } from "estree";
import { type AST } from "svelte/compiler";

export type PrimitiveType = "string" | "number" | "boolean" | "object";

export interface SvelteOptionProp {
  attributeName?: string | undefined;
  isReflected?: boolean | undefined;
  type?: PrimitiveType | undefined;
}

export interface InferredSvelteOptionProps {
  [propName: string]: SvelteOptionProp;
}

// TODO: we have no types for the typescript AST yet, probably should pull in a library to get them
// ... but for now I'll just write my own
export interface TypedVariableDeclarator extends VariableDeclarator {
  id: VariableDeclarator["id"] & {
    typeAnnotation: TypeAnnotation;
  };
}

interface Identifier extends AST.BaseNode {
  type: "Identifier";
  name: string;
}

interface TSTypeReference extends AST.BaseNode {
  type: "TSTypeReference";
  typeName: Identifier;
}

interface TSStringKeyword extends AST.BaseNode {
  type: "TSStringKeyword";
  typeName: Identifier;
}

interface TypeAnnotation extends AST.BaseNode {
  typeAnnotation: TSTypeReference | TSStringKeyword;
}

interface PropertySignature extends AST.BaseNode {
  type: "TSPropertySignature";
  key: Identifier;
  typeAnnotation: TypeAnnotation;
}

interface InterfaceBody extends AST.BaseNode {
  type: "TSInterfaceBody";
  // TODO: there are propably other things that could come here... like method signatures?
  body: PropertySignature[];
}

export interface InterfaceDeclaration extends AST.BaseNode {
  type: "TSInterfaceDeclaration";
  id: Identifier;
  // TODO: if we go really advanced we should probably handle generics here too..
  body: InterfaceBody;
}
