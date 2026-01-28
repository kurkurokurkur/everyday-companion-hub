import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, Circle, Filter, CalendarDays } from "lucide-react";
import { addMonths, format, isAfter, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  createdAt: string;
  dueDate: string;
}

type FilterType = "all" | "active" | "completed";

const filterLabels: Record<FilterType, string> = {
  all: "전체",
  active: "진행 중",
  completed: "완료됨",
};

export function TodoList() {
  const { user, loading, plan } = useAuth();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem("todos");
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [pendingTask, setPendingTask] = useState("");
  const [pendingDates, setPendingDates] = useState<Date[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos, user]);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    const { data, error } = await supabase
      .from("todos")
      .select("id, task, is_completed, due_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "할 일 불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      const mapped = (data ?? []).map((row) => ({
        id: row.id,
        task: row.task,
        isCompleted: row.is_completed,
        createdAt: row.created_at,
        dueDate: row.due_date,
      }));
      setTodos(mapped);
    }
    setIsSyncing(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      fetchTodos();
    }
  }, [user, loading, fetchTodos]);

  const maxDate = addMonths(startOfDay(new Date()), plan === "free" ? 1 : 3);
  const isDateBlocked = (date: Date) => isAfter(startOfDay(date), maxDate);

  const addTodo = async () => {
    console.debug("addTodo clicked", { newTask, viewDate });
    if (isDateBlocked(viewDate)) {
      setShowUpgrade(true);
      return;
    }

    setPendingTask(newTask.trim());
    setPendingDates([viewDate]);
    setSaveMessage(null);
    setShowAddCalendar(true);
  };

  const handleSaveSelectedDates = async () => {
    console.debug("save clicked", { pendingTask, pendingDates, user });
    setSaveMessage(null);
    if (isSyncing) {
      setSaveMessage("저장 중입니다. 잠시만 기다려주세요.");
      return;
    }
    if (!pendingTask.trim()) {
      setSaveMessage("할 일을 입력하세요.");
      toast({ title: "할 일을 입력하세요." });
      return;
    }
    if (pendingDates.length === 0) {
      setSaveMessage("날짜를 선택하세요.");
      toast({ title: "날짜를 선택하세요." });
      return;
    }

    const blocked = pendingDates.some((date) => isDateBlocked(date));
    if (blocked) {
      setShowUpgrade(true);
      return;
    }

    const dueDates = pendingDates.map((date) => format(date, "yyyy-MM-dd"));

    if (!user) {
      const newTodos: Todo[] = dueDates.map((dueDate, index) => ({
        id: `${Date.now()}-${index}`,
        task: pendingTask,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        dueDate,
      }));
      setTodos((prev) => [...newTodos, ...prev]);
      setViewDate(pendingDates[0]);
      setNewTask("");
      setSaveMessage("로컬 저장 완료");
      setShowAddCalendar(false);
      setPendingTask("");
      setPendingDates([]);
      return;
    }

    setIsSyncing(true);
    setSaveMessage("저장 중...");
    
    const rows = dueDates.map((dueDate) => ({
      user_id: user.id,
      task: pendingTask.trim(),
      is_completed: false,
      due_date: dueDate,
    }));
    
    console.log("=== 저장 시도 ===");
    console.log("유저 ID:", user.id);
    console.log("저장할 데이터:", rows);
    
    const { data, error } = await supabase.from("todos").insert(rows).select();
    
    if (error) {
      console.error("=== 저장 실패 ===", error);
      setSaveMessage(`저장 실패: ${error.message}`);
      toast({ title: "할 일 추가 실패", description: error.message, variant: "destructive" });
      setIsSyncing(false);
      return;
    }
    
    console.log("=== 저장 성공 ===", data);
    
    await fetchTodos();
    setViewDate(pendingDates[0]);
    setNewTask("");
    setSaveMessage("저장 완료!");
    toast({ title: "할 일 추가 완료", description: `${dueDates.length}개 날짜에 추가됨` });
    setShowAddCalendar(false);
    setPendingTask("");
    setPendingDates([]);
    setIsSyncing(false);
  };

  const toggleTodo = (id: string) => {
    if (!user) return;

    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    // 로컬 상태 먼저 업데이트
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
      )
    );

    // DB 업데이트 (에러 발생 시 롤백)
    void (async () => {
      try {
        const { error } = await supabase
          .from("todos")
          .update({ is_completed: !target.isCompleted })
          .eq("id", id);
        
        if (error) {
          // 에러 발생 시 로컬 상태 롤백
          setTodos((prev) =>
            prev.map((todo) =>
              todo.id === id ? { ...todo, isCompleted: target.isCompleted } : todo
            )
          );
          toast({ title: "할 일 업데이트 실패", description: error.message, variant: "destructive" });
          fetchTodos();
        }
      } catch (err) {
        // 예외 발생 시에도 롤백
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, isCompleted: target.isCompleted } : todo
          )
        );
        console.error("할 일 업데이트 중 오류:", err);
      }
    })();
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
    if (!user) return;
    void (async () => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) {
        toast({ title: "할 일 삭제 실패", description: error.message, variant: "destructive" });
        fetchTodos();
      }
    })();
  };

  const selectedDateKey = format(viewDate, "yyyy-MM-dd");
  const filteredTodos = todos
    .filter((todo) => {
      if (filter === "active") return !todo.isCompleted;
      if (filter === "completed") return todo.isCompleted;
      return true;
    })
    .filter((todo) => todo.dueDate === selectedDateKey);

  const activeCount = filteredTodos.filter((t) => !t.isCompleted).length;
  const completedCount = filteredTodos.filter((t) => t.isCompleted).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          오늘: {format(new Date(), "yyyy-MM-dd")}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowDatePicker(true)}>
          더보기
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addTodo();
        }}
        className="flex gap-2"
      >
        <Input
          placeholder={`${selectedDateKey} 할 일을 입력하세요...`}
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 h-11"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={isSyncing}>
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {!user && (
        <div className="text-xs text-muted-foreground">
          로그인하면 할 일이 Supabase DB에 저장됩니다.{" "}
          <Link to="/auth" className="underline hover:text-foreground">
            로그인하기
          </Link>
        </div>
      )}

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
            <DialogDescription>할 일을 확인할 날짜를 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="mb-2 text-sm text-muted-foreground">
            선택 날짜: {format(viewDate, "yyyy-MM-dd")}
          </div>
          <Calendar
            mode="single"
            selected={viewDate}
            onSelect={(date) => {
              if (!date) return;
              if (isDateBlocked(date)) {
                setShowUpgrade(true);
                return;
              }
              setViewDate(date);
              setShowDatePicker(false);
            }}
            disabled={plan === "free" ? { after: maxDate } : undefined}
            initialFocus
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddCalendar}
        onOpenChange={(open) => {
          setShowAddCalendar(open);
          if (!open) {
            setPendingTask("");
            setPendingDates([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>할 일 추가 날짜 선택</DialogTitle>
            <DialogDescription>여러 날짜를 선택한 뒤 저장하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">할 일</label>
            <Input
              placeholder="할 일을 입력하세요"
              value={pendingTask}
              onChange={(e) => setPendingTask(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="mb-2 text-sm text-muted-foreground">
            선택됨: {pendingDates.length}일
          </div>
          <Calendar
            mode="multiple"
            selected={pendingDates}
            onSelect={(dates) => setPendingDates(dates ?? [])}
            disabled={plan === "free" ? { after: maxDate } : undefined}
            initialFocus
          />
          <Button type="button" className="mt-3 w-full" onClick={handleSaveSelectedDates}>
            저장
          </Button>
          {saveMessage && (
            <div className="text-sm text-muted-foreground">
              {saveMessage}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>유료 버전 안내</DialogTitle>
            <DialogDescription>무료/유료 일정 범위를 확인하세요.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            무료 버전은 1개월까지만 일정 관리가 가능합니다. 1개월 이후 날짜는 유료 버전에서 사용할 수 있습니다.
          </p>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              setShowUpgrade(false);
              navigate("/pricing");
            }}
          >
            유료 버전 소개 보기
          </Button>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Circle className="h-3 w-3" />
            {activeCount} 진행 중
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3" />
            {completedCount} 완료
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterLabels[filter]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(filterLabels) as FilterType[]).map((f) => (
              <DropdownMenuItem key={f} onClick={() => setFilter(f)}>
                {filterLabels[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filter === "all"
              ? "할 일을 추가해보세요!"
              : filter === "active"
              ? "진행 중인 할 일이 없습니다."
              : "완료된 할 일이 없습니다."}
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 animate-scale-in ${
                todo.isCompleted ? "bg-muted/30 border-muted" : "bg-card hover:shadow-soft border-border"
              }`}
            >
              <Checkbox
                checked={todo.isCompleted}
                onCheckedChange={() => toggleTodo(todo.id)}
                className="h-5 w-5"
              />
              <span
                className={`flex-1 transition-all duration-200 ${
                  todo.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {todo.task}
              </span>
              <span className="text-xs text-muted-foreground">{todo.dueDate}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => deleteTodo(todo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

