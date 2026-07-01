import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getGroqApiKey() {
  const envKey = process.env.GROQ_API_KEY;
  if (envKey) {
    return envKey.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf8");
    const match = envContent.match(/^\s*GROQ_API_KEY\s*=\s*(.+)$/m);
    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Ignore missing env file and fall back to a clear error below.
  }

  return null;
}

function tryEvaluateArithmetic(message: string) {
  const normalized = message.replace(/×/g, "*").replace(/÷/g, "/");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const left = Number(match[1]);
  const right = Number(match[3]);
  const operator = match[2];

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }

  const result = (() => {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return right === 0 ? null : left / right;
      default:
        return null;
    }
  })();

  return result === null ? null : String(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a message to start the conversation." },
        { status: 400 }
      );
    }

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const arithmeticResult = tryEvaluateArithmetic(message);
    if (arithmeticResult) {
      return NextResponse.json({ reply: arithmeticResult });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are Nexio AI, an intelligent AI assistant created by Nexio. Your personality is professional, friendly, intelligent and concise. Help users with studying, coding, business, creativity and problem solving. Never mention ChatGPT or OpenAI unless directly asked. Always introduce yourself as Nexio AI.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Groq request failed");
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("Groq returned an empty response.");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process your request right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
