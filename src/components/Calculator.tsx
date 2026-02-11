import { useState, useCallback, useEffect } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

type Operation = "+" | "-" | "*" | "/" | null;

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setExpression("");
  }, []);

  const deleteLastDigit = useCallback(() => {
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  }, [display]);

  const toggleSign = useCallback(() => {
    setDisplay((parseFloat(display) * -1).toString());
  }, [display]);

  const inputPercent = useCallback(() => {
    const value = parseFloat(display) / 100;
    setDisplay(value.toString());
  }, [display]);

  const performOperation = useCallback((nextOperation: Operation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setExpression(`${inputValue} ${nextOperation}`);
    } else if (operation) {
      const currentValue = previousValue;
      let result: number;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "*":
          result = currentValue * inputValue;
          break;
        case "/":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(result);
      setExpression(`${result} ${nextOperation}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, operation, previousValue]);

  const calculate = useCallback(() => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result: number;

    switch (operation) {
      case "+":
        result = previousValue + inputValue;
        break;
      case "-":
        result = previousValue - inputValue;
        break;
      case "*":
        result = previousValue * inputValue;
        break;
      case "/":
        result = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
      default:
        return;
    }

    setDisplay(String(result));
    setExpression(`${previousValue} ${operation} ${inputValue} =`);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  }, [display, operation, previousValue]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
      } else if (e.key === ".") {
        inputDecimal();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        performOperation(e.key as Operation);
      } else if (e.key === "Enter" || e.key === "=") {
        calculate();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        clear();
      } else if (e.key === "Backspace") {
        deleteLastDigit();
      } else if (e.key === "%") {
        inputPercent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, calculate, clear, deleteLastDigit, inputPercent]);

  const buttonClass = "h-14 text-lg font-medium transition-all duration-150 active:scale-95";
  const numberClass = `${buttonClass} bg-muted text-black hover:bg-muted/80 border border-border`;
  const operatorClass = `${buttonClass} bg-primary hover:bg-primary/90 text-primary-foreground`;
  const functionClass = `${buttonClass} bg-slate-700 text-white hover:bg-slate-600`;
  const deleteClass = `${buttonClass} bg-muted text-foreground hover:bg-muted/80 border border-border`;

  return (
    <div className="space-y-4">
      {/* Display */}
      <div className="bg-card/90 border border-border rounded-xl p-4 space-y-1 shadow-soft">
        <div className="text-right text-sm text-muted-foreground h-5 truncate">
          {expression}
        </div>
        <div className="text-right text-3xl sm:text-4xl font-bold text-foreground truncate">
          {display}
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-4 gap-2">
        <Button className={functionClass} onClick={clear}>
          C
        </Button>
        <Button className={functionClass} onClick={toggleSign}>
          ±
        </Button>
        <Button className={functionClass} onClick={inputPercent}>
          %
        </Button>
        <Button className={operatorClass} onClick={() => performOperation("/")}>
          ÷
        </Button>

        <Button className={numberClass} onClick={() => inputDigit("7")}>
          7
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("8")}>
          8
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("9")}>
          9
        </Button>
        <Button className={operatorClass} onClick={() => performOperation("*")}>
          ×
        </Button>

        <Button className={numberClass} onClick={() => inputDigit("4")}>
          4
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("5")}>
          5
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("6")}>
          6
        </Button>
        <Button className={operatorClass} onClick={() => performOperation("-")}>
          −
        </Button>

        <Button className={numberClass} onClick={() => inputDigit("1")}>
          1
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("2")}>
          2
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("3")}>
          3
        </Button>
        <Button className={operatorClass} onClick={() => performOperation("+")}>
          +
        </Button>

        <Button className={numberClass} onClick={inputDecimal}>
          .
        </Button>
        <Button className={numberClass} onClick={() => inputDigit("0")}>
          0
        </Button>
        <Button className={deleteClass} onClick={deleteLastDigit}>
          <Delete className="h-5 w-5" />
        </Button>
        <Button className={operatorClass} onClick={calculate}>
          =
        </Button>
      </div>
    </div>
  );
}
