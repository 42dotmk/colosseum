export default function ErrorComponent({error}:{error:string}){
  return (
    <div className="text-center py-20">
      <p className="text-destructive">{error}</p>
    </div>
  );
}