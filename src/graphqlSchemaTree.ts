import deepcopy from "deepcopy";
import { GraphQLSchema } from "graphql";
import selectn from "selectn";
import { SchemaNode } from "./node";
import { buildSchemaTree, SchemaTree, SchemaTreeOption } from "./tree";

export class GraphQLSchemaTree {
  private schema: GraphQLSchema;
  private option?: SchemaTreeOption;
  readonly tree: SchemaTree;

  constructor(schema: GraphQLSchema, option?: SchemaTreeOption) {
    this.schema = schema;
    this.option = option;
    this.tree = buildSchemaTree(schema, option);
  }

  getNode(path: string, isCopy = false) {
    const node = selectn(path, this.tree) as SchemaNode | undefined;
    if (node === undefined) {
      return null;
    }
    return isCopy ? deepcopy(node) : node;
  }
}
