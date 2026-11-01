import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./tests/browser",use:{baseURL:"http://127.0.0.1:3000",channel:"chrome",viewport:{width:1440,height:900}},workers:1,reporter:"list",timeout:90000});
