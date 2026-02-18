import { GoogleGenAI } from "@google/genai";
import { Transaction, Category } from "../types";
import { LANGUAGE_NAMES } from "../constants";

const getClient = () => {
  try {
    // Process.env.API_KEY is injected by Vite at build time.
    // We check purely for existence here.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.warn("Gemini API Key is missing. Please check your .env file or deployment settings.");
      return null;
    }
    
    // Initialize the client. The Project ID (e.g. gen-lang-client...) is automatically 
    // inferred from the valid API Key for that project.
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    return null;
  }
};

export const aiService = {
  getDashboardInsights: async (
    transactions: Transaction[], 
    categories: Category[], 
    budget: number, 
    currentMonthExpenses: number,
    lastMonthSamePeriodExpenses: number,
    totalBalance: number,
    currentDay: number,
    currency: string,
    languageCode: string = 'en'
  ): Promise<string> => {
    const ai = getClient();
    if (!ai) return "AI Service Unavailable (Check API Key)";

    const languageName = LANGUAGE_NAMES[languageCode] || 'English';

    // Calculate top expense category from the passed transactions (recent ones)
    const catTotals: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const c = categories.find(cat => cat.id === t.categoryId)?.name || 'Uncategorized';
        catTotals[c] = (catTotals[c] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
    const topCatStr = sortedCats.length > 0 ? `${sortedCats[0][0]} (${currency}${sortedCats[0][1].toFixed(0)})` : 'None';

    const recentTxStr = transactions.slice(0, 15).map(t => {
      const cat = categories.find(c => c.id === t.categoryId)?.name || t.type;
      return `- ${t.date.split('T')[0]}: ${t.amount} on ${cat}`;
    }).join('\n');

    const prompt = `
      You are a helpful, non-judgmental friend helping with money. Your goal is to help the user stay on track this month.
      
      **IMPORTANT: Output your response strictly in ${languageName}.**

      Context (Today is Day ${currentDay}):
      - THIS Month Spending (Day 1-${currentDay}): ${currency}${currentMonthExpenses}
      - LAST Month Spending (Day 1-${currentDay}): ${currency}${lastMonthSamePeriodExpenses}
      - Total Balance Available (Savings): ${currency}${totalBalance}
      - Monthly Budget Limit: ${budget > 0 ? currency + budget : 'Not Set'}
      - Top Expense Recently: ${topCatStr}
      
      Recent Transactions:
      ${recentTxStr}

      Compare this month's pace to last month. 
      - If THIS month is higher, warn them gently.
      - If THIS month is lower, encourage them to keep it up.
      
      Provide exactly 3 simple points in plain ${languageName}:
      1. 📅 **The Pace**: Compare spending Day 1-${currentDay} vs Last Month Day 1-${currentDay}. Are they doing better or worse?
      2. 🛑 **The Leak**: Look at recent transactions. What is one specific thing they should stop buying for the rest of this month?
      3. 💡 **The Save**: A simple tip to protect their Total Balance (${currency}${totalBalance}) before the month ends.

      Keep it short, punchy, and direct. No fluff. Do not use Markdown formatting like bold (**). Just plain text lines.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "No insights available.";
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      if (error.message?.includes('403') || error.message?.includes('401') || error.message?.includes('API key not valid')) {
          return "Access denied. Please verify your new API Key.";
      }
      return "Unable to generate insights at this moment.";
    }
  },

  getReportAnalysis: async (
    current: { label: string, dateRange: string, income: number, expense: number, topCategories: {name: string, amount: number}[] },
    previous: { label: string, dateRange: string, income: number, expense: number } | null,
    currency: string,
    languageCode: string = 'en'
  ): Promise<string> => {
    const ai = getClient();
    if (!ai) return "AI Service Unavailable";

    const languageName = LANGUAGE_NAMES[languageCode] || 'English';
    let prompt = '';

    if (previous) {
        // Comparative Analysis
        const expenseDiff = current.expense - previous.expense;
        const diffStr = expenseDiff > 0 ? `increased by ${expenseDiff.toFixed(0)}` : `decreased by ${Math.abs(expenseDiff).toFixed(0)}`;
        
        prompt = `
          Act as a helpful, non-judgmental friend helping with money. Explain the financial situation in very simple, plain language that anyone can understand. 
          **Avoid** professional words like "variance", "audit", "allocation", or "strategic adjustment". Keep it casual and easy.
          
          **IMPORTANT: Write the response in ${languageName}.**

          Comparison Context:
          - Period A (Now): ${current.label} (Spent ${currency}${current.expense})
          - Period B (Before): ${previous.label} (Spent ${currency}${previous.expense})
          - Difference: Expenses ${diffStr}
          - Main things bought recently: ${current.topCategories.map(c => `${c.name} (${c.amount})`).join(', ')}
          
          Write a simple 3-part summary:
          1. 📊 **What Changed?**: Simply say if spending went up or down and by how much. Was it a big change?
          2. 🧐 **Why?**: Look at the "Main things bought". Which category is the reason for the change?
          3. 💡 **Easy Idea**: Give one very simple, stress-free tip to save money next time.
          
          Output Format: HTML (use <h4> for titles, <p> for text, <ul>/<li> for lists). Keep sentences short and friendly.
        `;
    } else {
        // Single Period Analysis
        prompt = `
          Act as a helpful, non-judgmental friend helping with money. Explain the financial situation in very simple, plain language that anyone can understand.
          **Avoid** professional words like "profitability", "audit", or "fiscal". Keep it casual and easy.
          
          **IMPORTANT: Write the response in ${languageName}.**

          Context:
          - Period: ${current.label}
          - Money In: ${currency}${current.income}
          - Money Out: ${currency}${current.expense}
          - Top Expenses: ${current.topCategories.map(c => `${c.name} (${c.amount})`).join(', ')}
          
          Write a simple 3-part summary:
          1. 💰 **The Big Picture**: Did I spend more than I earned? Just a simple yes/no and if it's safe.
          2. 🔎 **Where the money went**: Point out the biggest expense category simply.
          3. 💡 **Easy Idea**: A simple, stress-free suggestion to reduce that specific expense by a tiny bit.
          
          Output Format: HTML (use <h4> for titles, <p> for text, <ul>/<li> for lists). Keep sentences short and friendly.
        `;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Analysis failed.";
    } catch (error: any) {
      console.error("AI Report Error:", error);
      if (error.message?.includes('403') || error.message?.includes('401')) {
          return "Access denied. Please check your API Key.";
      }
      return "Unable to complete analysis.";
    }
  }
};