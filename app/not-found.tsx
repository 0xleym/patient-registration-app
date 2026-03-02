import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The page you are looking for does not exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-6xl font-bold text-muted-foreground/30">404</p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline">View Documentation</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
