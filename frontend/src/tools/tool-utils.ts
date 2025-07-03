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
    parameters: ToolParameters;
    fun: ToolFunction;
    result: ResultConst | null;
}

const TOOLS: Tool[] = [];

export const registerTool = (toolName: string, description: string, parameters: FormalParameter[], result: ResultConst | null, fun: ToolFunction) => {
    TOOLS.push(
        {
            name: toolName,
            description,
            parameters: {
                type: "object",
                properties: parameters.reduce<ToolProperties>((acc, parameter) => {
                    acc[parameter.name] = { type: parameter.type };
                    return acc;
                }, {}),
                required: parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name)
            },
            fun,
            result,
        }
    );
}

export const getPromptWithTools = (): string => {
    const tools = JSON.stringify(TOOLS, null, 2);
    return `You have access to functions. If you decide to invoke any of the function(s),
you MUST put it in the format of
{"name": function name, "parameters": dictionary of argument name and its value}

If you do not have to use any function calls, then just return a plain string with your response.

You SHOULD NOT include any other text in the response if you call a function. The name of the function
should match EXACTLY one of these functions at a time:
${tools}`;
}

export const executeToolCall = (name: string, params: Record<string, unknown>): string | null => {
    const tool = TOOLS.filter((tool: Tool) => tool.name === name);
    if (tool.length !== 1) {
        console.error("Failed tool call, matching either multiple tools or matched none!");
        return null;
    }

    const callingTool = tool[0];

    if (callingTool.result === null) {
        callingTool.fun(params);
        return "";
    }

    return callingTool.result.result;
}