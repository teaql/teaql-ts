{
  function expression(target, calls) {
    return { type: "CallChain", target, calls: calls.map(item => item[3]) };
  }
}

Start
  = _ value:Expression _ ";"? _ { return value; }

Expression
  = target:Identifier calls:(_ "." _ Call)+ { return expression(target, calls); }

Call
  = method:Identifier _ "(" _ args:Arguments? _ ")" {
      return { type: "Call", method, arguments: args || [] };
    }

Arguments
  = head:Value tail:(_ "," _ Value)* { return [head, ...tail.map(item => item[3])]; }

Value
  = Expression
  / Array
  / DoubleQuotedString
  / SingleQuotedString
  / Number
  / Boolean
  / Null

Array
  = "[" _ values:Arguments? _ "]" { return values || []; }

DoubleQuotedString
  = value:$('"' ("\\" . / [^"\\])* '"') { return JSON.parse(value); }

SingleQuotedString
  = "'" chars:("\\" escaped:. { return escaped; } / [^'\\])* "'" { return chars.join(""); }

Number
  = value:$('-'? ([0-9]+ "." [0-9]+ / [0-9]+) ([eE] [+-]? [0-9]+)?) { return Number(value); }

Boolean
  = "true" !IdentifierPart { return true; }
  / "false" !IdentifierPart { return false; }

Null
  = "null" !IdentifierPart { return null; }

Identifier
  = value:$([A-Za-z_$] IdentifierPart*) { return value; }

IdentifierPart
  = [A-Za-z0-9_$]

_ = [ \t\r\n]*
