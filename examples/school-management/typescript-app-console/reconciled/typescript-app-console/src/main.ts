import { UserContext } from "../../typescript-lib-core/src/teaql-ts";
import { GENERATED_RUNTIME_MODULE } from "../../typescript-lib-core/src/runtime-module";

const context = new UserContext();
console.log("school-management-service TeaQL console ready", {
  context: context.constructor.name,
  entities: Object.keys(GENERATED_RUNTIME_MODULE.schemas).length,
});