import { GraphQLObjectType } from "graphql";
import { GraphQLSchemaTree } from "graphqlSchemaTree";
import { SchemaNodeHandler } from "handler";
import path from "path";
import { arrayToTree } from "performant-array-to-tree";
import { getSchema } from "../../src/util";

export async function main() {
  const schemaPath = path.resolve(__dirname, "./schema.graphql");
  const schema = await getSchema({ pathOrEndpoint: schemaPath });

  // create a tree from GraphQL schema object
  const tree = new GraphQLSchemaTree(schema, {
    typeName: "Query",
    maxDepth: 3,
  });

  // get a node from the tree
  const user = tree.getNode("query.user");
  if (user == null) {
    return;
  }

  // show a node info
  console.log("=== query.user info:\n", JSON.stringify(user.__info, null, 2));

  // set a flag when a same type is appeared in the herarchy
  console.log(
    "=== before calling handler.setIsAppeared\n",
    JSON.stringify((user as any).followers.nodes.__info.type, null, 2)
  );

  const handler = new SchemaNodeHandler(user);
  handler.setIsAppeared("breadthFirst");

  console.log(
    "=== after calling handler.setIsAppeared\n",
    JSON.stringify((user as any).followers.nodes.__info.type, null, 2)
  );

  // get fields
  const fields = handler.getFields();
  console.log("=== fields for user.query:\n", handler.getFieldNames());

  // get arguments
  const args = handler.getArguments();
  console.log("=== arguments for user.query:\n", handler.getArgumentNames());

  // validate an argument
  console.log(
    "=== validate 'login' argument wiht a value:\n",
    handler.validateArgument("login", 333)
  );

  // traverse nodes and convert own data structure
  const userAsRoot = tree.getNodeAsRoot("query.user")!;
  const handlerAsRoot = new SchemaNodeHandler(userAsRoot);
  const ourArray: Array<{ [key: string]: any }> = [];
  handlerAsRoot.traverseNode(
    (node) => {
      const info = node.__info;
      const item = {
        id: info.path,
        title: info.name,
        parentId: info.parentPath,
        isObject: info.type.graphQLType instanceof GraphQLObjectType,
      };
      ourArray.push(item);
    },
    {
      traversing: "breadthFirst",
    }
  );
  console.log("=== converted own data:\n", ourArray.length);
  // to tree by arrayToTree
  const converted = arrayToTree(ourArray, { dataField: null });
  console.log("=== converted tree:\n", converted);
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
