import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import OpenAI from "openai";

// OpenAI API 키 (하드코딩)
const OPENAI_API_KEY = "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";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // 브라우저에서 사용하기 위해 필요
});

// Function Calling을 위한 함수 정의
const availableFunctions = {
  // 상품 목록 조회 함수
  get_products: async () => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("name, plan_type, price, duration_months, description, features")
        .eq("is_active", true)
        .order("plan_type", { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return {
        success: true,
        products: products?.map((product) => ({
          name: product.name,
          planType: product.plan_type,
          price: Number(product.price),
          durationMonths: product.duration_months,
          description: product.description,
          features: product.features,
        })) || [],
      };
    } catch (error: any) {
      return { error: error.message || "상품 조회 중 오류가 발생했습니다." };
    }
  },

  // 계산기 함수
  calculate: async (expression: string) => {
    try {
      // 안전한 계산식 평가 (간단한 수학 연산만 허용)
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
      
      // eval 대신 더 안전한 방법 사용
      // 간단한 수학 표현식만 허용
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        return { error: "지원하지 않는 계산식입니다." };
      }

      // 괄호 매칭 확인
      let openCount = 0;
      for (const char of sanitized) {
        if (char === "(") openCount++;
        if (char === ")") openCount--;
        if (openCount < 0) {
          return { error: "잘못된 괄호 사용입니다." };
        }
      }
      if (openCount !== 0) {
        return { error: "괄호가 맞지 않습니다." };
      }

      // 계산 실행 (제한된 범위에서만)
      const result = eval(sanitized);
      
      if (typeof result !== "number" || !isFinite(result)) {
        return { error: "계산 결과가 유효하지 않습니다." };
      }

      return {
        success: true,
        expression: expression,
        result: result,
      };
    } catch (error: any) {
      return { error: error.message || "계산 중 오류가 발생했습니다." };
    }
  },

  // 현재 시간 조회 함수
  get_current_time: async () => {
    const now = new Date();
    return {
      success: true,
      currentTime: now.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "long",
      }),
      timestamp: now.toISOString(),
    };
  },

  // 상품 검색 함수
  search_products: async (searchTerm: string) => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("name, plan_type, price, duration_months, description, features")
        .eq("is_active", true)
        .ilike("name", `%${searchTerm}%`); // 대소문자 구분 없이 부분 일치 검색

      if (error) {
        return { error: error.message };
      }

      return {
        success: true,
        searchTerm: searchTerm,
        products: products?.map((product) => ({
          name: product.name,
          planType: product.plan_type,
          price: Number(product.price),
          durationMonths: product.duration_months,
          description: product.description,
          features: product.features,
        })) || [],
        count: products?.length || 0,
      };
    } catch (error: any) {
      return { error: error.message || "상품 검색 중 오류가 발생했습니다." };
    }
  },
};

// OpenAI Function Calling을 위한 tools 정의
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_products",
      description: "데이터베이스에서 활성화된 상품 목록을 조회합니다. 사용자가 상품, 가격, 플랜 등에 대해 물어볼 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "수학 계산식을 평가합니다. 사용자가 계산을 요청할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "계산할 수학 표현식 (예: '2 + 2', '10 * 5', '100 / 4')",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_current_time",
      description: "현재 날짜와 시간을 조회합니다. 사용자가 시간, 날짜, 오늘 등에 대해 물어볼 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description: "상품 이름으로 상품을 검색합니다. 사용자가 특정 상품 이름을 언급하거나 상품을 찾고 싶어할 때 사용합니다. 예: '무료 버전', '월간', '연간', '유료' 등",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "검색할 상품 이름 또는 키워드 (예: '무료', '월간', '연간', '유료 버전' 등)",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
];

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // DB에서 메시지 불러오기
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("메시지 불러오기 실패:", error);
        // 기본 환영 메시지 추가
        setMessages([
          {
            id: "welcome",
            text: "안녕하세요! 무엇을 도와드릴까요?",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      if (data && data.length > 0) {
        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender as "user" | "bot",
          timestamp: new Date(msg.created_at),
        }));
        setMessages(formattedMessages);
      } else {
        // 메시지가 없으면 환영 메시지 추가
        setMessages([
          {
            id: "welcome",
            text: "안녕하세요! 무엇을 도와드릴까요?",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("메시지 불러오기 오류:", error);
      setMessages([
        {
          id: "welcome",
          text: "안녕하세요! 무엇을 도와드릴까요?",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 채팅창이 열릴 때 메시지 불러오기
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // 실시간 메시지 구독
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMessage: Message = {
            id: payload.new.id,
            text: payload.new.message,
            sender: payload.new.sender as "user" | "bot",
            timestamp: new Date(payload.new.created_at),
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const messageText = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // 사용자 메시지를 즉시 UI에 표시
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // 사용자 메시지 DB에 저장 (비동기, 실패해도 계속 진행)
      try {
        await supabase
          .from("chat_messages")
          .insert({
            user_id: user?.id || null,
            message: messageText,
            sender: "user",
          });
      } catch (error) {
        console.error("메시지 저장 실패:", error);
      }

      // 봇 응답 생성
      let botResponseText = "";

      try {
        // "테스트" 키워드 감지 시 상품 목록 조회
        if (messageText === "테스트") {
          try {
            const { data: products, error: productsError } = await supabase
              .from("products")
              .select("name, plan_type, price, duration_months")
              .eq("is_active", true)
              .order("plan_type", { ascending: true });

            if (productsError) {
              console.error("상품 조회 실패:", productsError);
              botResponseText = "상품 정보를 불러오는 중 오류가 발생했습니다.";
            } else if (products && products.length > 0) {
              const productList = products
                .map((product) => {
                  const priceText = product.price === 0 
                    ? "무료" 
                    : `${Number(product.price).toLocaleString("ko-KR")}원`;
                  return `• ${product.name} (${priceText}, ${product.duration_months}개월)`;
                })
                .join("\n");
              botResponseText = `현재 제공 중인 상품 목록입니다:\n\n${productList}`;
            } else {
              botResponseText = "현재 등록된 상품이 없습니다.";
            }
          } catch (error) {
            console.error("상품 조회 오류:", error);
            botResponseText = "상품 정보를 불러오는 중 오류가 발생했습니다.";
          }
        } else {
          // OpenAI API를 사용한 AI 응답 생성 (Function Calling 포함)
          try {
            // 대화 히스토리 준비 (최근 10개 메시지, 현재 사용자 메시지 제외)
            const recentMessages = messages.slice(-10);
            const conversationHistory: any[] = recentMessages.map((msg) => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.text,
            }));

            // 현재 사용자 메시지 추가
            conversationHistory.push({
              role: "user",
              content: messageText,
            });

            // 첫 번째 API 호출 (Function Calling 포함)
            let completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "당신은 친절하고 도움이 되는 AI 어시스턴트입니다. 한국어로 답변해주세요. 함수를 호출해야 할 때는 적절한 함수를 사용하세요.",
                },
                ...conversationHistory,
              ],
              tools: tools,
              tool_choice: "auto",
              max_tokens: 1000,
              temperature: 0.7,
            });

            const message = completion.choices[0]?.message;
            const toolCalls = message?.tool_calls;

            // 함수 호출이 필요한 경우
            if (toolCalls && toolCalls.length > 0) {
              // 함수 호출 결과를 저장할 배열
              const toolResults: any[] = [];

              // 각 함수 호출 실행
              for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

                console.log(`함수 호출: ${functionName}`, functionArgs);

                // 함수 실행
                let functionResult: any;
                if (functionName === "get_products") {
                  functionResult = await availableFunctions.get_products();
                } else if (functionName === "calculate") {
                  functionResult = await availableFunctions.calculate(functionArgs.expression);
                } else if (functionName === "get_current_time") {
                  functionResult = await availableFunctions.get_current_time();
                } else if (functionName === "search_products") {
                  functionResult = await availableFunctions.search_products(functionArgs.searchTerm);
                } else {
                  functionResult = { error: `알 수 없는 함수: ${functionName}` };
                }

                // 함수 호출 결과를 메시지에 추가
                toolResults.push({
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  name: functionName,
                  content: JSON.stringify(functionResult),
                });
              }

              // 함수 호출 결과를 포함하여 두 번째 API 호출
              completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: "당신은 친절하고 도움이 되는 AI 어시스턴트입니다. 한국어로 답변해주세요. 함수 호출 결과를 바탕으로 사용자에게 친절하고 이해하기 쉬운 답변을 제공하세요.",
                  },
                  ...conversationHistory,
                  message!, // 첫 번째 응답 (함수 호출 포함)
                  ...toolResults, // 함수 호출 결과
                ],
                tools: tools,
                tool_choice: "auto",
                max_tokens: 1000,
                temperature: 0.7,
              });
            }

            botResponseText = completion.choices[0]?.message?.content || "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.";
          } catch (openaiError: any) {
            console.error("OpenAI API 오류:", openaiError);
            botResponseText = "AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
          }
        }
      } catch (error) {
        console.error("봇 응답 생성 오류:", error);
        botResponseText = "응답 생성 중 오류가 발생했습니다.";
      }

      // 봇 응답을 UI에 표시
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

      // 봇 메시지 DB에 저장 (비동기, 실패해도 계속 진행)
      try {
        await supabase
          .from("chat_messages")
          .insert({
            user_id: user?.id || null,
            message: botResponseText,
            sender: "bot",
          });
      } catch (error) {
        console.error("봇 메시지 저장 실패:", error);
      }

    } catch (error) {
      console.error("메시지 전송 오류:", error);
      // 에러 발생 시에도 기본 응답 표시
      const errorBotMessage: Message = {
        id: `bot-error-${Date.now()}`,
        text: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorBotMessage]);
    } finally {
      // 항상 isSending 상태 리셋
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 채팅 버튼 */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* 채팅창 */}
      {isOpen && (
        <div className="flex flex-col h-[500px] w-[380px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">채팅</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 break-words",
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-gray-900 border border-gray-200"
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender === "user"
                        ? "text-primary-foreground/70"
                        : "text-gray-500"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="flex-1"
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                size="icon"
                className="shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
