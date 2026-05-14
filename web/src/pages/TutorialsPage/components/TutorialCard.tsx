import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookOpenText, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TutorialListItem } from "../types/TutorialListItem";
import { resolveThumbnail } from "../utils/resolveThumbnail";


export default function TutorialCard({tutorial}: {tutorial: TutorialListItem}) {
  const thumbnail = resolveThumbnail(tutorial);

  return (
    <Card className="overflow-hidden">
      <Link to={`/tutorials/${tutorial.documentId}`}>
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="bg-secondary/30">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={tutorial.title}
                className="w-full h-44 md:h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-44 md:h-full flex items-center justify-center text-muted-foreground">
                <BookOpenText className="h-6 w-6" />
              </div>
            )}
          </div>
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{tutorial.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {tutorial.readTimeMinutes} min read
                </span>
                {tutorial.relatedProblem?.title && (
                  <Badge variant="outline" className="text-[10px]">
                    Related: {tutorial.relatedProblem.title}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {tutorial.summary || 'Open to read this tutorial.'}
              </p>
            </CardContent>
          </div>
        </div>
      </Link>
    </Card>
  )
}