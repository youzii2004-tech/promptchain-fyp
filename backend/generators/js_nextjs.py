import json

def generate_nextjs_code(prompt: str, schema: dict, model: str) -> str:
    """
    Generates a Next.js App Router API route handler for calling OpenAI with structured outputs.
    """
    schema_str = json.dumps(schema, indent=2).replace('\n', '\n    ')
    safe_prompt = prompt.replace("`", "\\`").replace("${", "\\${")
    
    code = (
        "import { NextResponse } from 'next/server';\n"
        "import OpenAI from 'openai';\n\n"
        "const openai = new OpenAI({\n"
        "  apiKey: process.env.OPENAI_API_KEY || '',\n"
        "});\n\n"
        "export async function POST(req: Request) {\n"
        "  try {\n"
        "    const body = await req.json();\n"
        "    const userMessage = body.message || \"Execute the prompt\";\n\n"
        f"    const systemPrompt = `{safe_prompt}`;\n\n"
        f"    const jsonSchema = {schema_str};\n\n"
        "    const response = await openai.chat.completions.create({\n"
        f"      model: \"{model}\",\n"
        "      messages: [\n"
        "        { role: \"system\", content: systemPrompt },\n"
        "        { role: \"user\", content: userMessage }\n"
        "      ],\n"
        "      response_format: {\n"
        "        type: \"json_schema\",\n"
        "        json_schema: {\n"
        "          name: \"output_schema\",\n"
        "          schema: jsonSchema,\n"
        "          strict: true\n"
        "        }\n"
        "      },\n"
        "    });\n\n"
        "    const content = response.choices[0].message.content;\n"
        "    const parsedData = JSON.parse(content || \"{}\");\n\n"
        "    return NextResponse.json({ data: parsedData });\n"
        "  } catch (error: any) {\n"
        "    console.error(\"API Route Error:\", error);\n"
        "    return NextResponse.json({ error: error.message || \"An error occurred\" }, { status: 500 });\n"
        "  }\n"
        "}\n"
    )
    
    return code
