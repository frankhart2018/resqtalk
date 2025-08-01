interface FormalParameter {
  name: string;
  type: string;
  required: boolean;
}

interface ToolProperties {
  [key: string]: { type: string };
}

type ToolFunction = (params: Record<string, unknown>) => void;

interface ToolParameters {
  type: "object";
  properties: ToolProperties;
  required: string[];
}

interface ResultConst {
  result: string;
}

interface Tool {
  name: string;
  description: string;
  userguidelines: string;
  parameters: ToolParameters;
  fun: ToolFunction;
  result: ResultConst | null;
}

const TOOLS: Tool[] = [];

export const registerTool = (
  toolName: string,
  description: string,
  userguidelines: string,
  parameters: FormalParameter[],
  result: ResultConst | null,
  fun: ToolFunction
) => {
  TOOLS.push({
    name: toolName,
    description,
    userguidelines,
    parameters: {
      type: "object",
      properties: parameters.reduce<ToolProperties>((acc, parameter) => {
        acc[parameter.name] = { type: parameter.type };
        return acc;
      }, {}),
      required: parameters
        .filter((parameter) => parameter.required)
        .map((parameter) => parameter.name),
    },
    fun,
    result,
  });
};


export const getPromptWithTools = (): string => {
  const tools = JSON.stringify(
    TOOLS.map(({ result, ...rest }: Tool) => rest),
    null,
    2
  );
  
  // Make it clear this is system information, not user content
  return `<system>Emergency functions available: ${tools}. When needed, use format: {"name": "functionName", "parameters": {}}</system>`;
};

export const executeToolCall = (
  name: string,
  params: Record<string, unknown>
): string | null => {
  const tool = TOOLS.filter((tool: Tool) => tool.name === name);
  if (tool.length !== 1) {
    console.error(
      "Failed tool call, matching either multiple tools or matched none!"
    );
    return null;
  }

  const callingTool = tool[0];
  callingTool.fun(params);

  return callingTool.result !== null ? callingTool.result.result : "";
};