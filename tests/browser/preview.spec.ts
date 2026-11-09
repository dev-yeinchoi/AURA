import {test,expect,type Page} from "@playwright/test";
const saved=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem("aura.preview.v1")!));
async function answerSurvey(page:Page){for(const row of await page.locator("fieldset.question").all())await row.getByRole("radio").nth(2).check();}
async function capture(page:Page,options:{path:string;fullPage?:boolean}){await page.evaluate(()=>document.fonts.ready);await page.locator("img").evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));await page.screenshot(options);}
test("설문, 두 라운드, 재접속, 잠금, 종료 흐름",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.clock.install();await page.goto("/");await expect(page.getByRole("button",{name:"실험 시작",exact:true})).toBeDisabled();
 await capture(page,{path:"test-results/entry-1440.png",fullPage:true});
 await page.goto("/preview");await page.getByLabel("Authority").selectOption("high");await page.getByLabel("Explanation").selectOption("case");await page.getByRole("button",{name:"미리보기 시작"}).click();
 await page.getByRole("button",{name:"동의서 확인"}).click();await page.getByRole("radio",{name:"동의하고 참여"}).check();await page.getByRole("button",{name:"다음",exact:true}).click();
 await expect(page.locator(".demographic-options")).toHaveCount(3);
 expect(await page.locator(".demographic-options").nth(1).evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(3);
 await page.locator(".survey-container").hover();await page.mouse.wheel(0,900);
 await expect.poll(()=>page.locator(".survey-container").evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.scrollY)).toBe(0);
 await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();await expect(page.locator("fieldset.question")).toHaveCount(15);await capture(page,{path:"test-results/ppd-1440.png"});await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();
 await expect(page.getByRole("heading",{name:"사전 설문(2)"})).toBeVisible();await expect(page.locator("fieldset.question")).toHaveCount(6);await expect(page.getByRole("radio",{name:"전혀 나와 같지 않다"})).toHaveCount(6);await expect(page.getByRole("radio",{name:"보통이다"})).toHaveCount(6);await expect(page.getByRole("radio",{name:"매우 나와 같다"})).toHaveCount(6);await capture(page,{path:"test-results/ncs-1440.png"});await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();
 const order=(await saved(page)).order;
 for(let round=0;round<2;round++){
  if(round===1){await expect(page.getByRole("dialog")).toContainText("다른 독립적인 상황");await capture(page,{path:"test-results/round-2-modal-1440.png"});await page.getByRole("dialog").getByRole("button",{name:"확인"}).click();}
  await expect(page.locator(".scenario-copy p")).toHaveCount(2);if(round===0)await capture(page,{path:"test-results/scenario-1-1440.png"});await page.getByRole("button",{name:"다음 내용"}).click();await expect(page.locator(".scenario-copy p")).toHaveCount(3);if(round===0)await capture(page,{path:"test-results/scenario-2-1440.png"});await page.getByRole("button",{name:"이전 내용"}).click();await expect(page.locator(".scenario-copy p")).toHaveCount(2);await page.getByRole("button",{name:"다음 내용"}).click();await expect(page.getByRole("button",{name:/상황 확인 완료/})).toBeDisabled();await page.clock.fastForward(31000);await page.getByRole("button",{name:/상황 확인 완료/}).click();
  await expect(page.getByRole("heading",{name:"상황 이해도 확인"})).toBeVisible();expect(await page.locator(".options").first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);await page.getByRole("radio").nth(round===0?1:2).check();await page.getByRole("button",{name:"다음",exact:true}).click();
  await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();await expect(page.locator(".employee-card")).toHaveCount(12);await expect(page.locator(".recommendation")).toHaveCount(0);await page.getByRole("button",{name:"첫 판단 시작"}).click();
  await expect(page.locator(".timer")).toContainText(/남은 시간\s+06:00/);
  await expect(page.locator(".authority-badge")).toHaveCount(0);await expect(page.locator('.choices [aria-pressed="true"]')).toHaveCount(0);await expect(page.getByRole("button",{name:"AI 의견 확인"})).toBeDisabled();
  if(round===0){await capture(page,{path:"test-results/initial-1440.png"});await page.getByRole("button",{name:"배정하기",exact:true}).click();await expect(page.getByRole("button",{name:"배정하기",exact:true})).toHaveCSS("background-color","rgb(245, 253, 245)");await page.reload();await expect(page.getByRole("button",{name:"배정하기",exact:true})).toHaveAttribute("aria-pressed","true");expect((await saved(page)).order).toEqual(order);}
  for(let i=0;i<12;i++){await page.getByRole("button",{name:i%2?"보류하기":"배정하기",exact:true}).click();if(i<11)await page.getByRole("button",{name:"다음 프로필 >"}).click();}
  const initial={...(await saved(page)).decisions};await page.getByRole("button",{name:"AI 의견 확인"}).click();await expect(page.getByText("직원 정보를 확인하고 있습니다.")).toBeVisible();await expect(page.locator(".loading-content")).toHaveCount(1);await expect(page.locator(".navigation")).toHaveCount(0);await expect(page.locator(".timer")).toHaveCount(0);if(round===0)await capture(page,{path:"test-results/loading-1440.png"});await page.clock.fastForward(11000);
  await expect(page.locator(".recommendation")).toHaveCount(12);await expect(page.locator(".case-card")).toHaveCount(12);await expect(page.getByText("당시 담당자의 최종 결정",{exact:true})).toHaveCount(0);await page.locator(".case-toggle").first().click();await expect(page.getByText("당시 담당자의 최종 결정",{exact:true})).toHaveCount(1);await expect(page.getByText("당시 규칙상 선발 결과",{exact:true})).toHaveCount(0);
  await expect(page.locator(".timer")).toContainText(/남은 시간\s+0[23]:\d\d/);await expect(page.locator(".case-toggle").first()).toHaveAttribute("aria-expanded","true");
  const visibleOrder=await page.locator(".employee-card header h3").allTextContents();const recommended=await page.locator(".employee-card").evaluateAll(cards=>cards.map(card=>card.querySelector(".recommendation")?.textContent?.includes("배정 추천")));
  expect(recommended).toEqual([...recommended].sort((a,b)=>Number(b)-Number(a)));expect(visibleOrder.slice(0,5)).toEqual([...visibleOrder.slice(0,5)].sort());
  await expect(page.getByRole("button",{name:/최종 판단 진행하기/})).toBeDisabled();await page.clock.fastForward(31000);
  if(round===0)await capture(page,{path:"test-results/case-1440.png"});
  await page.getByRole("button",{name:/최종 판단 진행하기/}).click();await expect(page.locator('.choices [aria-pressed="true"]')).toHaveCount(0);await expect(page.locator(".screen-heading .authority-badge")).toHaveCount(0);await expect(page.locator(".timer")).toContainText(/남은 시간\s+06:00/);if(round===0)await capture(page,{path:"test-results/final-1440.png"});
  for(let i=0;i<12;i++){await page.getByRole("button",{name:i%2?"배정하기":"보류하기",exact:true}).click();if(i<11)await page.getByRole("button",{name:"다음 프로필 >"}).click();}
  for(const [key,value] of Object.entries(initial))expect((await saved(page)).decisions[key]).toBe(value);
  await page.getByRole("button",{name:"최종 판단 제출"}).click();await answerSurvey(page);await page.getByRole("button",{name:"다음",exact:true}).click();
 }
 await answerSurvey(page);await expect(page.getByRole("heading",{name:"[AI 시스템에 대한 체감 정확도]"})).toBeVisible();await expect(page.getByRole("heading",{name:/자유 응답.*선택/})).toBeVisible();await expect(page.locator("#accuracy")).toHaveAttribute("step","5");await page.locator(".accuracy").scrollIntoViewIfNeeded();await capture(page,{path:"test-results/post-accuracy-1440.png"});await expect(page.getByRole("button",{name:"제출",exact:true})).toBeEnabled();await page.getByRole("button",{name:"제출",exact:true}).click();await expect(page.getByRole("heading",{name:"연구 참여가 완료되었습니다."})).toBeVisible();expect((await saved(page)).stage).toBe("done");expect((await saved(page)).answers["1:post:accuracy"]).toBe(50);expect((await saved(page)).answers["1:post:comments"]).toBe("");expect(Object.keys((await saved(page)).decisions)).toHaveLength(48);expect(errors).toEqual([]);
});
test("6개 설명/권위 조건 및 노트북 화면에서 가로 넘침 없음",async({page})=>{
 await page.goto("/preview");await page.getByRole("button",{name:"미리보기 시작"}).click();const initial=await saved(page);
 for(const authority of ["low","high"]){for(const explanation of ["none","fi","case"]){
  await page.evaluate(s=>localStorage.setItem("aura.preview.v1",JSON.stringify(s)),{...initial,authority,explanation,stage:"advice"});await page.reload();await expect(page.locator(".recommendation")).toHaveCount(12);await expect(page.locator(".case-card")).toHaveCount(explanation==="case"?12:0);await expect(page.locator(".impact")).toHaveCount(explanation==="none"?0:48);await expect(page.locator(".authority-badge")).toHaveText(authority==="low"?"참고용 배정 지원":"공식 지정 배정 지원");await expect(page.getByText("양수(+)는 추천, 음수(−)는 보류 판단에 기여하며, 절댓값이 클수록 영향이 큽니다.")).toHaveCount(explanation==="none"?0:1);
  for(const size of [{width:1366,height:650},{width:1366,height:768},{width:1920,height:1080}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator(".navigation button").last()).toBeInViewport();}
 }}
 await page.setViewportSize({width:1366,height:768});await page.reload();await expect(page.locator(".app-header")).toHaveCount(1);await capture(page,{path:"test-results/case-1366.png"});
 expect(await page.locator("img").evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
});
test("DM-001~DM-006은 전화번호 없이 해당 G조건 데모로 연결",async({page})=>{
 for(let index=1;index<=6;index++){
  const code=`DM-${String(index).padStart(3,"0")}`;
  await page.goto("/");
  await page.getByLabel("참가자 번호").fill(code);
  await expect(page.getByLabel("휴대전화 번호 뒤 4자리")).toHaveCount(0);
  await page.getByRole("button",{name:`G${index} 데모 열기`}).click();
  await expect(page).toHaveURL(new RegExp(`account=${code}`));
  await expect(page.getByRole("heading",{name:`AURA 화면 데모 · G${index}`})).toBeVisible();
  await expect(page.getByLabel("Authority")).toBeDisabled();
  await expect(page.getByLabel("Explanation")).toBeDisabled();
 }
});
test("참가자 번호·전화 뒤 4자리 확인 후 본인 정보 확인 버튼을 눌러야 시작 가능",async({page})=>{
 await page.route("**/api/participant/session",route=>route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({authenticated:false})}));
 await page.route("**/api/participant/verify",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({participantCode:"PT-003",maskedName:"김**",maskedPhone:"010-****-1234"})}));
 await page.route("**/api/participant/login",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({participantCode:"PT-003"})}));
 await page.goto("/");
 await expect(page.getByLabel("참가자 번호")).toHaveAttribute("placeholder","MT-001");
 await expect(page.getByRole("link",{name:"화면 데모 보기"})).toHaveCount(0);
 await page.getByLabel("참가자 번호").fill("PT-003");
 await page.getByLabel("휴대전화 번호 뒤 4자리").fill("1234");
 await page.getByRole("button",{name:"정보 확인"}).click();
 await expect(page.getByText("010-****-1234")).toBeVisible();
 await expect(page.getByRole("button",{name:"실험 시작"})).toBeDisabled();
 await page.getByRole("button",{name:"확인, 본인 정보가 맞습니다"}).click();
 await expect(page.getByRole("button",{name:"실험 시작"})).toBeEnabled();
});
test("낮은 노트북 화면에서 주요 단계가 한 영역으로 스크롤되고 행동 버튼이 보임",async({page})=>{
 await page.setViewportSize({width:1366,height:650});
 await page.goto("/preview");await page.getByRole("button",{name:"미리보기 시작"}).click();
 const base=await saved(page);
 for(const stage of ["ncs","scenario","attention","browse","initial","advice","final","post"] as const){
  await page.evaluate(s=>localStorage.setItem("aura.preview.v1",JSON.stringify(s)),
    {...base,stage,enteredAt:Date.now()-45000,scenarioPage:stage==="scenario"?1:0});
  await page.reload();await expect(page.locator(".workspace")).toHaveAttribute("data-stage",stage);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(stage==="scenario")await expect(page.getByRole("button",{name:"상황 확인 완료"})).toBeInViewport();
  else await expect(page.locator(".navigation button").last()).toBeInViewport();
  if(stage==="post"){
    await page.locator("#comments").scrollIntoViewIfNeeded();
    await expect(page.locator("#comments")).toBeInViewport();
    await expect(page.locator(".navigation button").last()).toBeInViewport();
    await capture(page,{path:"test-results/post-1366x650.png"});
  }
  if(stage==="advice")await capture(page,{path:"test-results/advice-1366x650.png"});
 }
});
