import {readFile} from "node:fs/promises";
import {join} from "node:path";

export const runtime="nodejs";

const documents:Record<string,string>={
  information:"participant-information.pdf",
  consent:"written-consent.pdf",
};

export async function GET(request:Request,context:{params:Promise<{kind:string}>}){
  const {kind}=await context.params;
  const filename=documents[kind];
  const host=request.headers.get("host")?.split(":")[0]??"";
  if(process.env.NODE_ENV!=="development" || !["localhost","127.0.0.1"].includes(host) || !filename){
    return new Response("Not found",{status:404});
  }
  try{
    const pdf=await readFile(join(process.cwd(),"data","private","documents",filename));
    return new Response(new Uint8Array(pdf),{
      headers:{
        "Content-Type":"application/pdf",
        "Content-Disposition":`inline; filename="${filename}"`,
        "Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff",
      },
    });
  }catch{
    return new Response("Preview document is unavailable",{status:404});
  }
}
