import type { VariableDeclarator } from "estree";
import { type AST } from "svelte/compiler";

export type PrimitiveType =
  | "Array"
  | "Boolean"
  | "Number"
  | "Object"
  | "String";

export interface SvelteOptionProp {
  attributeName?: string | undefined;
  isReflected?: boolean | undefined;
  type?: PrimitiveType | undefined;
}

export interface InferredSvelteOptionProps {
  [propName: string]: SvelteOptionProp;
}

// SOMEDAY: we have no types for the typescript AST yet, probably should pull in a library to get them
// ... but for now I'll just write my own
export interface TypedVariableDeclarator extends VariableDeclarator {
  id: VariableDeclarator["id"] & {
    typeAnnotation: TypeAnnotation;
  };
}

interface Identifier extends AST.BaseNode {
  type: "Identifier";
  // this could either be a builtin type or a user defined type
  name: "Array" | "Record" | string;
}

interface TSTypeReference extends AST.BaseNode {
  type: "TSTypeReference";
  typeName: Identifier;
}

interface TSStringKeyword extends AST.BaseNode {
  type: "TSStringKeyword";
  typeName: Identifier;
}

interface TSNumberKeyword extends AST.BaseNode {
  type: "TSNumberKeyword";
  typeName: Identifier;
}

interface TSBooleanKeyword extends AST.BaseNode {
  type: "TSBooleanKeyword";
  typeName: Identifier;
}

interface TSArrayType extends AST.BaseNode {
  type: "TSArrayType";
  typeName: Identifier;
}

interface Literal extends AST.BaseNode {
  type: "Literal";
  value: number | string | boolean;
}

interface TSLiteralType extends AST.BaseNode {
  type: "TSLiteralType";
  literal?: Literal;
}

interface TSTypeLiteral extends AST.BaseNode {
  type: "TSTypeLiteral";
  members: PropertySignature[];
}

interface TypeAnnotation extends AST.BaseNode {
  typeAnnotation: Type;
}

interface TypeAliasDeclaration extends AST.BaseNode {
  type: "TSTypeAliasDeclaration";
  typeAnnotation: Type;
}

interface PropertySignature extends AST.BaseNode {
  type: "TSPropertySignature";
  key: Identifier;
  typeAnnotation: TypeAnnotation;
}

interface InterfaceBody extends AST.BaseNode {
  type: "TSInterfaceBody";
  body: PropertySignature[];
}

export interface InterfaceDeclaration extends AST.BaseNode {
  type: "TSInterfaceDeclaration";
  id: Identifier;
  // SOMEDAY: if we go really advanced we should probably handle generics here too..
  body: InterfaceBody;
}

export type Type =
  | TSTypeReference
  | TSArrayType
  | TSStringKeyword
  | TSNumberKeyword
  | TSTypeLiteral
  | TSLiteralType
  | TSBooleanKeyword;

export type TypeDeclaration = InterfaceDeclaration | TypeAliasDeclaration;
