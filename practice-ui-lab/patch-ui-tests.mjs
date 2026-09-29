import {readFile,writeFile} from 'node:fs/promises'; // 本番アプリではなく検査コードの待機と判定だけを修正します。
import assert from 'node:assert/strict'; // 期待した旧コードだけを変更します。
const path='practice-ui-lab/app/tools/browser-smoke.mjs'; // 展開された検証用のスクリプトです。
let text=await readFile(path,'utf8'); // 元の試験条件を読み込みます。
function replaceOnce(before,after){assert.equal(text.split(before).length,2,'Ambiguous test patch');text=text.replace(before,after);} // 違う版へ黙ってパッチを適用しません。
replaceOnce("()=>!document.getElementById('editorFields')?.disabled","()=>Boolean(document.getElementById('editorFields'))&&!document.getElementById('editorFields').disabled"); // HTML自体がない状態を起動成功に数えません。
replaceOnce("await page.locator('[data-open]').first().click();assert.equal(await page.locator('#detailItems article').count(),2);","await page.locator('[data-open]').first().click();await page.waitForFunction(()=>document.getElementById('detail').hidden===false);assert.equal(await page.locator('#detailItems article').count(),2);assert.deepEqual(await page.locator('#detailItems h3').allTextContents(),['1対1 10分','2対2 10分']);"); // Workerの非同期読込と画面切替を待って内容も完全照合します。
replaceOnce("assert.equal(await second.locator('#editorFields').isDisabled(),true);","assert.equal(await second.locator('#editorFields').evaluate(node=>node.disabled),true);assert.equal(await second.locator('#title').isDisabled(),true);"); // fieldsetのDOM属性と実際の入力要素の無効状態を両方確認します。
replaceOnce("results.every(r=>r.status==='pass')&&!report.partial","results.every(r=>r.status==='pass')&&!report.partial&&errors.length===0"); // 未捕捉の画面エラーも合格に含めません。
await writeFile(path,text); // アプリの実行ロジックと判定目標は変えません。
console.log('Patched async UI completion wait and fieldset/control disabled assertions. Product source unchanged.'); // 修正箇所を明示して証跡に残します。
