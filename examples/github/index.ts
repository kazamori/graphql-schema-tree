import { GraphQLSchemaTree } from "graphqlSchemaTree";
import { SchemaNodeHandler } from "handler";
import path from "path";
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
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
