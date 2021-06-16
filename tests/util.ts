import { convertDotNotationToFieldType } from "../src/util";

test("convert dot notation properties to a field type object", async () => {
  const dotNotations = [
    "query.data.id",
    "query.data.name",
    "query.name",
    "query.data.problems.id",
    "query.data.files.name",
    "query.data.problems.code",
    "query.data.problems.description",
    "query.data.useFunction",
    "query.data.useType",
    "query.data.enabled",
    "query.description",
    "query.data.files.updatedAt",
  ];
  const fieldType = convertDotNotationToFieldType(dotNotations);
  expect(fieldType).toEqual([
    {
      query: [
        {
          data: [
            "id",
            "name",
            {
              problems: ["id", "code", "description"],
            },
            {
              files: ["name", "updatedAt"],
            },
            "useFunction",
            "useType",
            "enabled",
          ],
        },
        "name",
        "description",
      ],
    },
  ]);
});
