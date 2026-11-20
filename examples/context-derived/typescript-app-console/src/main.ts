import { UserContext } from "./teaql-ts";
import { GENERATED_RUNTIME_MODULE } from "./runtime-module";

const context = new UserContext();
console.log("context-fix-service TeaQL console ready", {
  context: context.constructor.name,
  entities: Object.keys(GENERATED_RUNTIME_MODULE.schemas).length,
});