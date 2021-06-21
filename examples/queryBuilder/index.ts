import VariableOptions from "gql-query-builder/build/VariableOptions";
import { ArgumentValueInfo } from "../../src/handler";

/*
 * Utility functions for https://github.com/atulmy/gql-query-builder
 */

type simpleFields = (string | { [key: string]: simpleFields })[];

export function convertDotNotationToFields(
  dotNotationProperties: string[]
): simpleFields {
  const extract = (fields: simpleFields, tokens: string[]): void => {
    const [key, ...others] = tokens;
    if (tokens.length === 1) {
      fields.push(key);
    } else {
      let found = false;
      for (const item of fields) {
        if (typeof item === "string") {
          if (item === key) {
            found = true;
            fields[fields.indexOf(key)] = { [key]: [] };
            extract(fields, tokens);
          }
        } else if (typeof item === "object") {
          const field = item[key];
          if (field !== undefined) {
            found = true;
            extract(field, others);
          }
        }
      }
      if (!found) {
        fields.push({ [key]: [] });
        extract(fields, tokens);
      }
    }
  };

  const fields: simpleFields = [];
  for (const prop of dotNotationProperties) {
    extract(fields, prop.split("."));
  }
  return fields;
}

export function convertArgumentValueToVariables(
  name: string,
  info: ArgumentValueInfo
): VariableOptions {
  if (!name.includes(".")) {
    let list: boolean | [boolean] = false;
    if (info.type.isList === true) {
      if (info.type.isNonNull === true) {
        list = [true];
      } else {
        list = true;
      }
    }
    return {
      [name]: {
        type: info.type.graphQLType.name,
        value: info.value,
        list,
        required: info.type.isList
          ? info.type.isNonNullList
          : info.type.isNonNull,
      },
    };
  }

  const tokens = name.split(".");
  if (tokens.length !== 2) {
    throw new Error(
      "Only support simple GraphQLInputObjectType, e.g.) sort.by"
    );
  }

  const [parent, sub] = tokens;
  return {
    [parent]: {
      type: info.parentType!.graphQLType.name,
      required: info.parentType!.isNonNull,
      value: { [sub]: info.value },
    },
  };
}
