export default function Title(){
  const pageTitle = "Tutorials";
  const description = "Learn concepts, strategies, and task-specific solving walkthroughs."
  
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight"> {pageTitle} </h1>
      <p className="text-sm text-muted-foreground mt-1"> {description} </p>
    </>
  )
}