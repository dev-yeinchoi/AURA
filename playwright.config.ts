import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./tests/browser",use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??"http://localhost:3000",channel:"chrome",viewport:{width:1440,height:900}},workers:1,reporter:"list",timeout:90000});
