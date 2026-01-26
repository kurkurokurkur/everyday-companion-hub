import { useState } from "react";
import { ArrowRightLeft, Ruler, Weight, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = "length" | "weight" | "temperature";

const units = {
  length: [
    { value: "m", label: "미터 (m)" },
    { value: "km", label: "킬로미터 (km)" },
    { value: "mile", label: "마일 (mile)" },
    { value: "inch", label: "인치 (inch)" },
    { value: "ft", label: "피트 (ft)" },
    { value: "cm", label: "센티미터 (cm)" },
  ],
  weight: [
    { value: "kg", label: "킬로그램 (kg)" },
    { value: "g", label: "그램 (g)" },
    { value: "lb", label: "파운드 (lb)" },
    { value: "oz", label: "온스 (oz)" },
  ],
  temperature: [
    { value: "celsius", label: "섭씨 (°C)" },
    { value: "fahrenheit", label: "화씨 (°F)" },
    { value: "kelvin", label: "켈빈 (K)" },
  ],
};

const conversions: Record<string, Record<string, (val: number) => number>> = {
  length: {
    "m-km": (v) => v / 1000,
    "m-mile": (v) => v / 1609.344,
    "m-inch": (v) => v * 39.3701,
    "m-ft": (v) => v * 3.28084,
    "m-cm": (v) => v * 100,
    "km-m": (v) => v * 1000,
    "km-mile": (v) => v / 1.60934,
    "km-inch": (v) => v * 39370.1,
    "km-ft": (v) => v * 3280.84,
    "km-cm": (v) => v * 100000,
    "mile-m": (v) => v * 1609.344,
    "mile-km": (v) => v * 1.60934,
    "mile-inch": (v) => v * 63360,
    "mile-ft": (v) => v * 5280,
    "mile-cm": (v) => v * 160934.4,
    "inch-m": (v) => v / 39.3701,
    "inch-km": (v) => v / 39370.1,
    "inch-mile": (v) => v / 63360,
    "inch-ft": (v) => v / 12,
    "inch-cm": (v) => v * 2.54,
    "ft-m": (v) => v / 3.28084,
    "ft-km": (v) => v / 3280.84,
    "ft-mile": (v) => v / 5280,
    "ft-inch": (v) => v * 12,
    "ft-cm": (v) => v * 30.48,
    "cm-m": (v) => v / 100,
    "cm-km": (v) => v / 100000,
    "cm-mile": (v) => v / 160934.4,
    "cm-inch": (v) => v / 2.54,
    "cm-ft": (v) => v / 30.48,
  },
  weight: {
    "kg-g": (v) => v * 1000,
    "kg-lb": (v) => v * 2.20462,
    "kg-oz": (v) => v * 35.274,
    "g-kg": (v) => v / 1000,
    "g-lb": (v) => v / 453.592,
    "g-oz": (v) => v / 28.3495,
    "lb-kg": (v) => v / 2.20462,
    "lb-g": (v) => v * 453.592,
    "lb-oz": (v) => v * 16,
    "oz-kg": (v) => v / 35.274,
    "oz-g": (v) => v * 28.3495,
    "oz-lb": (v) => v / 16,
  },
  temperature: {
    "celsius-fahrenheit": (v) => (v * 9) / 5 + 32,
    "celsius-kelvin": (v) => v + 273.15,
    "fahrenheit-celsius": (v) => ((v - 32) * 5) / 9,
    "fahrenheit-kelvin": (v) => ((v - 32) * 5) / 9 + 273.15,
    "kelvin-celsius": (v) => v - 273.15,
    "kelvin-fahrenheit": (v) => ((v - 273.15) * 9) / 5 + 32,
  },
};

const categoryIcons = {
  length: Ruler,
  weight: Weight,
  temperature: Thermometer,
};

const categoryLabels = {
  length: "길이",
  weight: "무게",
  temperature: "온도",
};

export function UnitConverter() {
  const [category, setCategory] = useState<Category>("length");
  const [fromUnit, setFromUnit] = useState(units.length[0].value);
  const [toUnit, setToUnit] = useState(units.length[1].value);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<string>("");

  const handleCategoryChange = (newCategory: Category) => {
    setInputValue("");
    setResult("");
    setCategory(newCategory);
    setFromUnit(units[newCategory][0].value);
    setToUnit(units[newCategory][1].value);
  };

  const convert = (value: string) => {
    setInputValue(value);
    if (!value || isNaN(Number(value))) {
      setResult("");
      return;
    }

    const numValue = parseFloat(value);
    if (fromUnit === toUnit) {
      setResult(numValue.toFixed(4));
      return;
    }

    const conversionKey = `${fromUnit}-${toUnit}`;
    const conversionFn = conversions[category][conversionKey];

    if (conversionFn) {
      const converted = conversionFn(numValue);
      setResult(converted.toFixed(4));
    }
  };

  const swapUnits = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
    if (inputValue) {
      const numValue = parseFloat(inputValue);
      const conversionKey = `${toUnit}-${temp}`;
      const conversionFn = conversions[category][conversionKey];
      if (conversionFn) {
        const converted = conversionFn(numValue);
        setResult(converted.toFixed(4));
      }
    }
  };

  const CategoryIcon = categoryIcons[category];

  return (
    <div className="space-y-5">
      {/* Category Tabs */}
      <div className="flex gap-2">
        {(Object.keys(units) as Category[]).map((cat) => {
          const Icon = categoryIcons[cat];
          return (
            <Button
              key={cat}
              variant={category === cat ? "default" : "secondary"}
              size="sm"
              onClick={() => handleCategoryChange(cat)}
              className="flex-1 gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{categoryLabels[cat]}</span>
            </Button>
          );
        })}
      </div>

      {/* Conversion UI */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              입력 값
            </label>
            <Input
              type="number"
              placeholder="값을 입력하세요"
              value={inputValue}
              onChange={(e) => convert(e.target.value)}
              className="text-lg h-12"
            />
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              단위
            </label>
            <select
              key={`from-${category}`}
              value={fromUnit}
              onChange={(e) => {
                const nextValue = e.target.value;
                setFromUnit(nextValue);
                if (inputValue) {
                  convert(inputValue);
                }
              }}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {units[category].map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapUnits}
            className="rounded-full h-10 w-10 hover:bg-accent transition-all duration-200"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              결과
            </label>
            <div className="h-12 px-4 rounded-lg border bg-muted/50 flex items-center text-lg font-semibold">
              {result || "—"}
            </div>
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              단위
            </label>
            <select
              key={`to-${category}`}
              value={toUnit}
              onChange={(e) => {
                const nextValue = e.target.value;
                setToUnit(nextValue);
                if (inputValue) {
                  convert(inputValue);
                }
              }}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {units[category].map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
