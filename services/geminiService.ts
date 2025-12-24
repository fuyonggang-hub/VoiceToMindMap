
import { GoogleGenAI, Type } from "@google/genai";
import { TransformationResult } from "../types";

export const transformSpeech = async (audioBase64: string, mimeType: string): Promise<TransformationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    任务：处理附带的音频文件。
    1. 准确转录音频内容。
    2. 将转录内容改写为正式、专业且逻辑结构清晰的文档。必须使用简体中文。
    3. 确保语气客观、逻辑清晰、语言简练。
    4. 创建一个逻辑脑图结构（层次结构），捕捉正式文本中的要点及其支持细节。脑图中的所有标签必须使用简体中文。
    
    Response Format: JSON object with "originalTranscription", "formalText", and "mindMap" fields. All text content must be in Simplified Chinese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalTranscription: { type: Type.STRING, description: "音频的原始转录文本（简体中文）" },
            formalText: { type: Type.STRING, description: "润色后的正式文本（简体中文）" },
            mindMap: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "中心主题或标题（简体中文）" },
                children: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: "一级节点（简体中文）" },
                      children: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { label: { type: Type.STRING, description: "二级节点（简体中文）" } }
                        }
                      }
                    },
                    required: ["label"]
                  }
                }
              },
              required: ["label"]
            }
          },
          required: ["originalTranscription", "formalText", "mindMap"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as TransformationResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("处理音频失败。请重试。");
  }
};
