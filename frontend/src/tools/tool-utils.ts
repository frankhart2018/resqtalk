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

interface Tool {
    name: string;
    description: string;
    parameters: ToolParameters;
    fun: ToolFunction;
}

const TOOLS: Tool[] = [];

export const registerTool = (toolName: string, description: string, parameters: FormalParameter[], fun: ToolFunction) => {
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
            fun
        }
    );
}

export const getPromptWithTools = (): string => {
    const tools = TOOLS.map((tool: Tool) => JSON.stringify(tool)).join("\n");
    return `You have access to functions. If you decide to invoke any of the function(s),
you MUST put it in the format of
{"name": function name, "parameters": dictionary of argument name and its value}

If it is not a function call, NEVER return a JSON EVER!

You SHOULD NOT include any other text in the response if you call a function
${tools}`;
}

export const executeToolCall = (name: string, params: Record<string, unknown>) => {
    const tool = TOOLS.filter((tool: Tool) => tool.name === name);
    if (tool.length !== 1) {
        console.error("Failed tool call, matching either multiple tools or matched none!");
        return;
    }

    const callingTool = tool[0];
    callingTool.fun(params);
}