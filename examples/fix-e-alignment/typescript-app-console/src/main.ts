import { UserContext } from "./teaql-ts";
import { GENERATED_RUNTIME_MODULE } from "./runtime-module";

const context = new UserContext();
console.log("checker-fix-advanced TeaQL console ready", {
  context: context.constructor.name,
  entities: Object.keys(GENERATED_RUNTIME_MODULE.schemas).length,
});