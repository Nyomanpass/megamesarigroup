import Decimal from "decimal.js";

const operators = {
  "+": { precedence: 1, apply: (a, b) => a.plus(b) },
  "-": { precedence: 1, apply: (a, b) => a.minus(b) },
  "*": { precedence: 2, apply: (a, b) => a.mul(b) },
  "/": {
    precedence: 2,
    apply: (a, b) => {
      if (b.isZero()) {
        throw new Error("Rumus harga tidak valid: pembagian dengan nol");
      }
      return a.div(b);
    }
  }
};

const normalizeExpression = (formula, basePrice) => {
  const cleanFormula = String(formula || "").trim();
  if (!cleanFormula) return basePrice.toString();

  let expression = cleanFormula
    .replace(/,/g, ".")
    .replace(/\bharga\b/gi, basePrice.toString())
    .replace(/\bx\b/gi, basePrice.toString());

  if (/^[+\-*/]/.test(expression)) {
    expression = `${basePrice.toString()}${expression}`;
  }

  return expression.replace(/\s+/g, "");
};

const tokenize = (expression) => {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/[0-9.]/.test(char) || (char === "-" && (index === 0 || ["+", "-", "*", "/", "("].includes(expression[index - 1])))) {
      let number = char;
      index++;

      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        number += expression[index];
        index++;
      }

      if (number === "-" || number.split(".").length > 2) {
        throw new Error("Rumus harga tidak valid");
      }

      tokens.push({ type: "number", value: new Decimal(number) });
      continue;
    }

    if (operators[char]) {
      tokens.push({ type: "operator", value: char });
      index++;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index++;
      continue;
    }

    throw new Error("Rumus harga hanya boleh berisi angka dan operator + - * /");
  }

  return tokens;
};

const toRpn = (tokens) => {
  const output = [];
  const stack = [];

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      continue;
    }

    if (token.type === "operator") {
      while (
        stack.length &&
        stack[stack.length - 1].type === "operator" &&
        operators[stack[stack.length - 1].value].precedence >= operators[token.value].precedence
      ) {
        output.push(stack.pop());
      }
      stack.push(token);
      continue;
    }

    if (token.value === "(") {
      stack.push(token);
      continue;
    }

    while (stack.length && stack[stack.length - 1].value !== "(") {
      output.push(stack.pop());
    }

    if (!stack.length) {
      throw new Error("Rumus harga tidak valid: tanda kurung tidak sesuai");
    }

    stack.pop();
  }

  while (stack.length) {
    const token = stack.pop();
    if (token.value === "(") {
      throw new Error("Rumus harga tidak valid: tanda kurung tidak sesuai");
    }
    output.push(token);
  }

  return output;
};

const evaluateRpn = (tokens) => {
  const stack = [];

  for (const token of tokens) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();

    if (!left || !right) {
      throw new Error("Rumus harga tidak valid");
    }

    stack.push(operators[token.value].apply(left, right));
  }

  if (stack.length !== 1) {
    throw new Error("Rumus harga tidak valid");
  }

  return stack[0];
};

export const applyPriceFormula = (basePrice, formula) => {
  const baseDecimal = new Decimal(basePrice || 0);
  const expression = normalizeExpression(formula, baseDecimal);
  return evaluateRpn(toRpn(tokenize(expression)));
};
