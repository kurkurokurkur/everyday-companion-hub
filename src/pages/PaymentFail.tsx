import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentFail = () => {
  const location = useLocation();
  return (
    <>
      <Helmet>
        <title>결제 실패</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">결제 실패</CardTitle>
            <CardDescription>결제가 실패했습니다. 다시 시도해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="break-all">요청: {location.search || "-"}</div>
            <Button asChild className="w-full">
              <Link to="/pricing">다시 시도</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentFail;

