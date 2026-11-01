import {test,expect,type Page} from "@playwright/test";
const saved=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem("aura.preview.v1")!));
async function answerSurvey(page:Page){for(const row of await page.locator("fieldset.question").all())await row.getByRole("radio").nth(2).check();}
async function capture(page:Page,options:{path:string;fullPage?:boolean}){await page.evaluate(()=>document.fonts.ready);await page.locator("img").evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));await page.screenshot(options);}
test("설문, 두 라운드, 재접속, 잠금, 종료 흐름",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.clock.install();await page.goto("/");await expect(page.getByRole("button",{name:"시작하기",exact:true})).toBeDisabled();
 await capture(page,{path:"test-results/entry-1440.png",fullPage:true});
 await page.goto("/preview");await page.getByLabel("Authority").selectOption("high");await page.getByLabel("Explanation").selectOption("case");await page.getByRole("button",{name:"미리보기 시작"}).click();
 await page.getByRole("button",{name:"동의서 확인"}).click();await page.getByRole("radio",{name:"동의하고 참여"}).check();await page.getByRole("button",{name:"다음",exact:true}).click();
 await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();await expect(page.locator("fieldset.question")).toHaveCount(15);await capture(page,{path:"test-results/ppd-1440.png"});await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();
 const order=(await saved(page)).order;
 for(let round=0;round<2;round++){
  await expect(page.getByRole("button",{name:/다음 \(/})).toBeDisabled();await page.clock.fastForward(31000);await page.getByRole("button",{name:"다음",exact:true}).click();
  await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();await expect(page.locator(".employee-card")).toHaveCount(12);await expect(page.locator(".recommendation")).toHaveCount(0);await page.getByRole("button",{name:"첫 판단 시작"}).click();
  await expect(page.locator(".authority-badge")).toHaveCount(0);await expect(page.locator('.choices [aria-pressed="true"]')).toHaveCount(0);await expect(page.getByRole("button",{name:"AI 의견 확인"})).toBeDisabled();
  if(round===0){await capture(page,{path:"test-results/initial-1440.png"});await page.getByRole("button",{name:"배정하기",exact:true}).click();await page.reload();await expect(page.getByRole("button",{name:"배정하기",exact:true})).toHaveAttribute("aria-pressed","true");expect((await saved(page)).order).toEqual(order);}
  for(let i=0;i<12;i++){await page.getByRole("button",{name:i%2?"보류하기":"배정하기",exact:true}).click();if(i<11)await page.getByRole("button",{name:"다음 프로필 >"}).click();}
  const initial={...(await saved(page)).decisions};await page.getByRole("button",{name:"AI 의견 확인"}).click();await page.clock.fastForward(11000);await page.getByRole("button",{name:"다음",exact:true}).click();
  await expect(page.locator(".recommendation")).toHaveCount(12);await expect(page.locator(".case-card")).toHaveCount(12);await expect(page.getByText("당시 담당자의 최종 결정",{exact:true})).toHaveCount(12);await expect(page.getByText("당시 규칙상 선발 결과",{exact:true})).toHaveCount(0);
  if(round===0)await capture(page,{path:"test-results/case-1440.png"});
  await page.getByRole("button",{name:"최종 판단 진행하기"}).click();await expect(page.locator('.choices [aria-pressed="true"]')).toHaveCount(0);if(round===0)await capture(page,{path:"test-results/final-1440.png"});
  for(let i=0;i<12;i++){await page.getByRole("button",{name:i%2?"배정하기":"보류하기",exact:true}).click();if(i<11)await page.getByRole("button",{name:"다음 프로필 >"}).click();}
  for(const [key,value] of Object.entries(initial))expect((await saved(page)).decisions[key]).toBe(value);
  await page.getByRole("button",{name:"최종 판단 제출"}).click();await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();
 }
 await answerSurvey(page);await expect(page.getByRole("button",{name:"제출",exact:true})).toBeDisabled();await page.getByRole("button",{name:"현재 값 선택"}).click();await page.getByRole("button",{name:"제출",exact:true}).click();await expect(page.getByRole("heading",{name:"연구 참여가 완료되었습니다."})).toBeVisible();expect((await saved(page)).stage).toBe("done");expect(Object.keys((await saved(page)).decisions)).toHaveLength(48);expect(errors).toEqual([]);
});
test("6개 설명/권위 조건 및 노트북 화면에서 가로 넘침 없음",async({page})=>{
 await page.goto("/preview");await page.getByRole("button",{name:"미리보기 시작"}).click();const initial=await saved(page);
 for(const authority of ["low","high"]){for(const explanation of ["none","fi","case"]){
  await page.evaluate(s=>localStorage.setItem("aura.preview.v1",JSON.stringify(s)),{...initial,authority,explanation,stage:"advice"});await page.reload();await expect(page.locator(".recommendation")).toHaveCount(12);await expect(page.locator(".case-card")).toHaveCount(explanation==="case"?12:0);await expect(page.locator(".impact")).toHaveCount(explanation==="none"?0:explanation==="fi"?48:96);await expect(page.locator(".authority-badge")).toHaveText(authority==="low"?"참고용 배정 지원":"공식 지정 배정 지원");
  for(const size of [{width:1366,height:768},{width:1920,height:1080}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 }}
 await page.setViewportSize({width:1366,height:768});await page.reload();await expect(page.locator(".app-header")).toHaveCount(1);await capture(page,{path:"test-results/case-1366.png"});
 expect(await page.locator("img").evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
});
