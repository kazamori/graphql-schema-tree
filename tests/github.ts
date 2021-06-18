import { GraphQLObjectType, GraphQLSchema } from "graphql";
import path from "path";
import { GraphQLSchemaTree } from "../src/graphqlSchemaTree";
import { SchemaNodeHandler } from "../src/handler";
import { SchemaNode, SchemaNodeInfo } from "../src/node";
import { getParent } from "../src/tree";
import { getSchema } from "../src/util";

const schemaPath = path.resolve(__dirname, "../examples/github/schema.graphql");
let schema: GraphQLSchema;
let tree: GraphQLSchemaTree;

beforeAll((done) => {
  const before = async () => {
    schema = await getSchema({ pathOrEndpoint: schemaPath });
    tree = new GraphQLSchemaTree(schema, {
      typeName: "Query",
      maxDepth: 4,
    });
    done();
  };
  before();
});

test("get field names", async () => {
  const fieldNames = tree.getFieldNames();
  expect(fieldNames).toEqual([
    "codeOfConduct",
    "codesOfConduct",
    "enterprise",
    "enterpriseAdministratorInvitation",
    "enterpriseAdministratorInvitationByToken",
    "license",
    "licenses",
    "marketplaceCategories",
    "marketplaceCategory",
    "marketplaceListing",
    "marketplaceListings",
    "meta",
    "node",
    "nodes",
    "organization",
    "rateLimit",
    "relay",
    "repository",
    "repositoryOwner",
    "resource",
    "search",
    "securityAdvisories",
    "securityAdvisory",
    "securityVulnerabilities",
    "sponsorables",
    "sponsorsListing",
    "topic",
    "user",
    "viewer",
  ]);
});

test("access properties in the hierarchy", async () => {
  const user = tree.getNode("query.user", true) as any;
  expect(user).not.toBeNull();
  expect(user.__info).not.toBeNull();
  expect(user.name).not.toBeNull();
  expect(user.name.__info).not.toBeNull();
  expect(user.createdAt).not.toBeNull();
  expect(user.createdAt.__info).not.toBeNull();
  expect(user.followers.nodes.name).not.toBeNull();
  expect(user.followers.nodes.name.__info).not.toBeNull();
  // undefined
  expect(user.unexistent).toBeUndefined();
});

test("get parent from a node", async () => {
  const nodes = tree.getNode("query.user.followers.nodes")!;
  const parent = getParent(tree.tree, nodes)!;
  expect(parent.__info.name).toEqual("followers");
  expect(parent.__info.path).toEqual("query.user.followers");
});

test("get parent with prefix from a node", async () => {
  const nodes = tree.getNodeAsRoot("query.user.followers.nodes")!;
  const noParent = getParent(tree.tree, nodes);
  expect(noParent).toBeNull();
  const parent = getParent(tree.tree, nodes, "query.user.followers.")!;
  expect(parent.__info.name).toEqual("followers");
  expect(parent.__info.path).toEqual("query.user.followers");
});

test("verify property details", async () => {
  const nodes = tree.getNode("query.user.followers.nodes", true)!;
  const info = nodes.__info;
  expect(info.name).toEqual("nodes");
  expect(info.parentName).toEqual("followers");
  expect(info.parentPath).toEqual("query.user.followers");
  expect(info.path).toEqual("query.user.followers.nodes");
  expect(info.args).toEqual([]);
  expect(info.depth).toEqual(3);
  expect(info.isMaxDepth).toEqual(false);
  expect(info.children).toEqual([
    "anyPinnableItems",
    "avatarUrl",
    "bio",
    "bioHTML",
    "canReceiveOrganizationEmailsWhenNotificationsRestricted",
    "commitComments",
    "company",
    "companyHTML",
    "contributionsCollection",
    "createdAt",
    "databaseId",
    "email",
    "followers",
    "following",
    "gist",
    "gistComments",
    "gists",
    "hasSponsorsListing",
    "hovercard",
    "id",
    "interactionAbility",
    "isBountyHunter",
    "isCampusExpert",
    "isDeveloperProgramMember",
    "isEmployee",
    "isGitHubStar",
    "isHireable",
    "isSiteAdmin",
    "isSponsoredBy",
    "isSponsoringViewer",
    "isViewer",
    "issueComments",
    "issues",
    "itemShowcase",
    "location",
    "login",
    "name",
    "organization",
    "organizationVerifiedDomainEmails",
    "organizations",
    "packages",
    "pinnableItems",
    "pinnedItems",
    "pinnedItemsRemaining",
    "project",
    "projects",
    "projectsResourcePath",
    "projectsUrl",
    "publicKeys",
    "pullRequests",
    "repositories",
    "repositoriesContributedTo",
    "repository",
    "resourcePath",
    "savedReplies",
    "sponsorsListing",
    "sponsorshipForViewerAsSponsor",
    "sponsorshipsAsMaintainer",
    "sponsorshipsAsSponsor",
    "starredRepositories",
    "status",
    "topRepositories",
    "twitterUsername",
    "updatedAt",
    "url",
    "viewerCanChangePinnedItems",
    "viewerCanCreateProjects",
    "viewerCanFollow",
    "viewerCanSponsor",
    "viewerIsFollowing",
    "viewerIsSponsoring",
    "watching",
    "websiteUrl",
  ]);

  // type
  expect(info.type.graphQLType).toEqual(schema.getType("User"));
  expect(info.type.isList).toEqual(true);
  expect(info.type.isNonNull).toEqual(false);
  expect(info.type.isAppeared).toEqual(false);
});

test("get a node as root", async () => {
  const query = tree.getNode("query.user.followers")!;
  // normal path structure
  expect(query.__info.path).toEqual("query.user.followers");
  expect(query.__info.depth).toEqual(2);

  const followers = tree.getNodeAsRoot("query.user.followers")!;
  // root
  expect(followers.__info.name).toEqual("followers");
  expect(followers.__info.parentName).toEqual("");
  expect(followers.__info.parentPath).toEqual("");
  expect(followers.__info.path).toEqual("followers");
  expect(followers.__info.depth).toEqual(0);
  // sub node under root
  const nodes = followers.nodes as any;
  expect(nodes.__info.name).toEqual("nodes");
  expect(nodes.__info.parentName).toEqual("followers");
  expect(nodes.__info.parentPath).toEqual("followers");
  expect(nodes.__info.path).toEqual("followers.nodes");
  expect(nodes.__info.depth).toEqual(1);
  // sub node under sub node
  const status = nodes.status as any;
  expect(status.__info.name).toEqual("status");
  expect(status.__info.parentName).toEqual("nodes");
  expect(status.__info.parentPath).toEqual("followers.nodes");
  expect(status.__info.path).toEqual("followers.nodes.status");
  expect(status.__info.depth).toEqual(2);

  // don't affect the path structure by calling getNodeAsRoot()
  expect(query.__info.path).toEqual("query.user.followers");
  expect((query as any).nodes.status.__info.path).toEqual(
    "query.user.followers.nodes.status"
  );
  expect((query as any).nodes.status.__info.depth).toEqual(4);
});

test("reach max depth", async () => {
  // depth is 3
  const nodes = tree.getNode("query.user.followers.nodes", true);
  Object.values(nodes!).map((value: any) => {
    if (value.name === "nodes") {
      const info = value as SchemaNodeInfo;
      expect(info.isMaxDepth).toEqual(false);
      return;
    }

    const node = value as SchemaNode;
    if (node.__info.type.graphQLType instanceof GraphQLObjectType) {
      // depth is 4
      expect(node.__info.isMaxDepth).toEqual(true);
    }
  });

  // depth is 5
  const organization = tree.getNode(
    "query.user.followers.nodes.status.organization",
    true
  );
  expect(organization).toBeNull();
});

test("get a node from a handler", async () => {
  const user = tree.getNodeAsRoot("query.user") as any;
  const handler = new SchemaNodeHandler(user);
  const nodes = handler.getNode("user.followers.nodes")!;
  expect(nodes.__info.name).toEqual("nodes");
  expect(nodes.__info.parentPath).toEqual("user.followers");
  const followers = handler.getNode(nodes.__info.parentPath)!;
  expect(followers.__info.name).toEqual("followers");
  expect(followers.__info.path).toEqual("user.followers");
});

test("check a same type in the hierarchy", async () => {
  const user = tree.getNodeAsRoot("query.user") as any;
  const handler = new SchemaNodeHandler(user);
  const nodes = handler.getNode("user.followers.nodes")!;
  expect(
    handler.hasSameTypeInHierarchy(
      nodes.__info.type.graphQLType,
      nodes.__info.parentPath
    )
  ).toBeTruthy();
  const status = nodes.status as any;
  expect(
    handler.hasSameTypeInHierarchy(
      status.__info.type.graphQLType,
      status.__info.parentPath
    )
  ).toBeFalsy();
});

test("appear a same type with breadthFirst traversing", async () => {
  const user = tree.getNode("query.user", true) as any;
  const handler = new SchemaNodeHandler(user);

  expect(
    user.contributionsCollection.user.status.__info.type.isAppeared
  ).toBeFalsy();
  expect(user.status.__info.type.isAppeared).toBeFalsy();
  expect(user.followers.nodes.status.__info.type.isAppeared).toBeFalsy();

  handler.setIsAppeared("breadthFirst");

  expect(
    user.contributionsCollection.user.status.__info.type.isAppeared
  ).toBeTruthy();
  expect(user.status.__info.type.isAppeared).toBeFalsy();
  expect(user.followers.nodes.status.__info.type.isAppeared).toBeTruthy();
});

test("appear a same type with depthFirst traversing", async () => {
  const user = tree.getNode("query.user", true) as any;
  const handler = new SchemaNodeHandler(user);

  expect(
    user.contributionsCollection.user.status.__info.type.isAppeared
  ).toBeFalsy();
  expect(user.status.__info.type.isAppeared).toBeFalsy();
  expect(user.followers.nodes.status.__info.type.isAppeared).toBeFalsy();

  handler.setIsAppeared("depthFirst");

  expect(
    user.contributionsCollection.user.status.__info.type.isAppeared
  ).toBeFalsy();
  expect(user.status.__info.type.isAppeared).toBeTruthy();
  expect(user.followers.nodes.status.__info.type.isAppeared).toBeTruthy();
});

test("handle tree/node with call by reference", async () => {
  const globalTree = tree;
  const localTree = new GraphQLSchemaTree(schema, {
    typeName: "Query",
    maxDepth: 4,
  });

  expect(
    (globalTree.tree.query as any).user.status.__info.type.isAppeared
  ).toBeFalsy();
  expect(
    (localTree.tree.query as any).user.status.__info.type.isAppeared
  ).toBeFalsy();

  const user = localTree.getNode("query.user") as any;
  const handler = new SchemaNodeHandler(user);

  expect(user.status.__info.type.isAppeared).toBeFalsy();

  handler.setIsAppeared("depthFirst");

  expect(user.status.__info.type.isAppeared).toBeTruthy();

  expect(
    (globalTree.tree.query as any).user.status.__info.type.isAppeared
  ).toBeFalsy();
  expect(
    (localTree.tree.query as any).user.status.__info.type.isAppeared
  ).toBeTruthy();
});

test("traverse node", async () => {
  const query = tree.getNode("query.user", true)!;
  const handler = new SchemaNodeHandler(query);
  const traces: string[] = [];
  handler.traverseNode(
    (node) => {
      traces.push(node.__info.path);
    },
    { traversing: "breadthFirst" }
  );
  expect(traces.length).toEqual(2935);
  expect(traces[0]).toEqual("query.user");
  expect(traces[255]).toEqual(
    "query.user.contributionsCollection.popularPullRequestContribution.isRestricted"
  );
  expect(traces[1024]).toEqual(
    "query.user.organization.team.viewerCanSubscribe"
  );
});

test("traverse node as root", async () => {
  const user = tree.getNodeAsRoot("query.user")!;
  const handler = new SchemaNodeHandler(user);
  const traces: string[] = [];
  handler.traverseNode(
    (node) => {
      traces.push(node.__info.path);
    },
    { traversing: "breadthFirst" }
  );
  expect(traces.length).toEqual(2935);
  expect(traces[0]).toEqual("user");
  expect(traces[255]).toEqual(
    "user.contributionsCollection.popularPullRequestContribution.isRestricted"
  );
  expect(traces[1024]).toEqual("user.organization.team.viewerCanSubscribe");
});

test("traverse node excluding hidden paths", async () => {
  const query = tree.getNode("query.user", true)!;
  const handler = new SchemaNodeHandler(query);
  const traces: string[] = [];
  const hiddenPaths = [
    "query.user.contributionsCollection.popularPullRequestContribution.isRestricted",
    "query.user.organization.team.viewerCanSubscribe",
  ];
  handler.traverseNode(
    (node) => {
      traces.push(node.__info.path);
    },
    { traversing: "breadthFirst", hiddenPaths }
  );
  expect(traces.length).toEqual(2933);
  expect(traces[0]).toEqual("query.user");
  for (const path of hiddenPaths) {
    expect(traces.includes(path)).toBeFalsy();
  }
});

test("traverse node excluding hidden regular expressions", async () => {
  const query = tree.getNode("query.user", true)!;
  const handler = new SchemaNodeHandler(query);
  const traces: string[] = [];
  const hiddenPaths = [
    new RegExp(
      "query.user.contributionsCollection.popularPullRequestContribution.*"
    ),
    new RegExp("query.user.organization.*"),
  ];
  handler.traverseNode(
    (node) => {
      traces.push(node.__info.path);
    },
    { traversing: "breadthFirst", hiddenPaths }
  );
  expect(traces.length).toEqual(2544);
  expect(traces[0]).toEqual("query.user");
  for (const exp of hiddenPaths) {
    for (const path of traces) {
      expect(path.match(exp)).toBeNull();
    }
  }
});

test("handle fields", async () => {
  const user = tree.getNode("query.user", true) as any;
  const handler = new SchemaNodeHandler(user);
  const fields = handler.getFields();
  const fieldNames = handler.getFieldNames();
  expect(fields.length).toEqual(fieldNames.length);
  expect(fields[0].__info.name).toEqual(fieldNames[0]);
  expect(fields[10].__info.name).toEqual(fieldNames[10]);
});

test("handle arguments", async () => {
  const user = tree.getNode("query.user", true) as any;
  const handler1 = new SchemaNodeHandler(user);
  const args = handler1.getArguments();
  const argNames = handler1.getArgumentNames();
  expect(args.length).toEqual(argNames.length);
  expect(args[0].name).toEqual(argNames[0]);

  // case: 1
  // validation success
  expect(handler1.validateArgument("login", "t2y")).toBeNull();
  expect(handler1.convertArgumentValue("login", "t2y")).toEqual("t2y");
  // validation error
  expect(handler1.validateArgument("login", 333)).not.toBeNull();
  expect(handler1.validateArgument("login", true)).not.toBeNull();
  expect(handler1.validateArgument("login", { a: 1 })).not.toBeNull();

  // case: 2
  const issues = tree.getNode("query.user.issues", true) as any;
  const handler2 = new SchemaNodeHandler(issues);
  // validation success
  expect(handler2.validateArgument("filterBy", {})).toBeNull();
  expect(handler2.validateArgument("filterBy", { labels: ["bug"] })).toBeNull();
  const filterByValue = handler2.convertArgumentValue(
    "filterBy",
    '{ labels: ["bug"] }'
  );
  expect(filterByValue).toEqual({ labels: ["bug"], viewerSubscribed: false });
  // validation error
  expect(handler2.validateArgument("filterBy", "text")).not.toBeNull();
  expect(handler2.validateArgument("filterBy", 11)).not.toBeNull();

  // case: 3
  const repositories = tree.getNode("query.user.repositories", true) as any;
  const handler3 = new SchemaNodeHandler(repositories);
  // convert a value
  expect(handler3.convertArgumentValue("isFork", "true")).toBeTruthy();
  expect(handler3.convertArgumentValue("isLocked", "false")).toBeFalsy();

  // case: 4
  const followers = tree.getNode("query.viewer.followers", true) as any;
  const handler4 = new SchemaNodeHandler(followers);
  // convert a value
  expect(handler4.convertArgumentValue("first", "10")).toEqual(10);
});
