import Preview from "@/components/preview";

export default async function DemoPage({searchParams}:{searchParams:Promise<{account?:string}>}) {
  const {account}=await searchParams;
  return <Preview demo demoAccount={account} />;
}
