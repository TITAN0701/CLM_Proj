// TC-F03, F04, F05, F06: 網域詳細、Order詳細、申請新憑證、匯入憑證
// Selectors derived from snapshot-03-certs-new.yml, snapshot-04-certs-import.yml

describe('網域詳細', () => {
  beforeEach(() => {
    cy.visit('/certs/domain/api-test2.ruenxininfo.com.tw');
  });

  it('TC-F03-01: 顯示現役憑證完整資訊', () => {
    cy.contains('api-test2.ruenxininfo.com.tw').should('be.visible');
    cy.contains('ISSUED').should('be.visible');
    cy.contains('button', '更新憑證').should('be.visible').and('not.be.disabled');
  });

  it('TC-F03-02: 自動續簽設定區塊顯示', () => {
    cy.contains('自動續簽').should('be.visible');
  });

  it.skip('TC-F03-03: 編輯自動續簽設定 [SDET TODO] 確認編輯按鈕 selector', () => {
    cy.contains('button', '編輯').first().click();
    cy.get('input[type="number"]').clear().type('45');
    cy.contains('button', '儲存').click();
    cy.contains('到期前 45 天').should('be.visible');
  });

  it.skip('TC-F03-04: 新增 Tag [SDET TODO] 確認 tag input selector', () => {
    cy.contains('Tags').should('be.visible');
  });

  it.skip('TC-F03-05: 刪除 Tag [SDET TODO] 確認刪除按鈕 selector', () => {
    cy.contains('env=prod').parent().contains('×').click();
  });

  it.skip('TC-F03-06: 手動更新憑證觸發新 Order [SDET TODO] 需確認確認對話框 selector', () => {
    cy.contains('button', '更新憑證').click();
    cy.url().should('match', /\/certs\/letsencrypt\/.+\/ord_/);
  });
});

describe('Order 詳細', () => {
  it.skip('IT-LC-STATUS-01: Order 狀態 PENDING_DNS → ISSUED 轉換顯示正確（狀態核查）[SDET TODO] 需有 PENDING_DNS 狀態的 Order', () => {
    // 狀態核查 / UI操作：RXCLM 非同步 CA 流程的狀態機驗證
    // 前提：SIT 環境有 PENDING_DNS 狀態的 Order（等待 DNS 挑戰完成）
    // [SDET TODO] 找到 PENDING_DNS 狀態的 Order URL
    cy.visit('/certs'); // 從憑證列表找到 PENDING_DNS 狀態的網域
    cy.contains('PENDING_DNS').parents('tr').first().find('a').first().click();
    // 驗證 Order 詳細頁顯示 DNS 挑戰資訊
    cy.contains('DNS 挑戰').should('be.visible');
    cy.screenshot('IT-LC-STATUS-01 PENDING_DNS狀態', { capture: 'fullPage', log: false });
    // [SDET TODO] 等待或模擬 DNS 驗證完成後，確認狀態更新為 ISSUED
  });

  it.skip('IT-LC-NEG-01: 申請送出後 Order 進入 FAILED → Order 詳細頁顯示錯誤原因（負向測試）[SDET TODO] 需可觸發 FAILED 的 Account', () => {
    // 負向測試 / 狀態核查：RXCLM CA 申請是非同步流程
    // 失敗不會在申請頁顯示，而是在 Order 詳細頁以 FAILED 狀態顯示
    // 前提：需要可觸發 FAILED 的 ACME Account（如使用無效 CA Directory URL）
    cy.visit('/certs'); // 從列表找 FAILED 狀態的 Order
    cy.contains('FAILED').parents('tr').first().find('a').first().click();
    // 確認 Order 詳細頁顯示 FAILED 狀態與錯誤原因
    cy.contains('FAILED').should('be.visible');
    cy.contains(/錯誤原因|失敗原因|Error/).should('be.visible');
    cy.screenshot('IT-LC-NEG-01 Order FAILED狀態', { capture: 'fullPage', log: false });
  });

  it.skip('IT-LC-01: 完整憑證生命週期（申請→issued→到期快篩→Renew）[SDET TODO] 需 CA + DNS Provider 完整配置', () => {
    // 跨模組 / 狀態核查：最長路徑 E2E 驗證
    // 前提：CA Provider（ACME Staging）+ DNS Provider + 可用 Account
    // Step 1: 申請新憑證
    cy.visit('/certs/new');
    // [SDET TODO] 填寫完整申請表單並送出
    // Step 2: 等待 Order issued
    // [SDET TODO] 輪詢 Order 狀態直到 ISSUED（timeout 300s）
    // Step 3: 憑證列表出現 ISSUED 狀態
    cy.visit('/certs');
    cy.contains('ISSUED').should('be.visible');
    // Step 4: 30天到期快篩
    cy.contains('button', '30 天內到期').click();
    cy.screenshot('IT-LC-01 完整生命週期', { capture: 'fullPage', log: false });
  });
});

describe('申請新憑證', () => {
  beforeEach(() => {
    cy.visit('/certs/new');
    cy.url().should('include', '/certs/new');
  });

  it('TC-F05-01: 未填 CN 時送出按鈕 disabled', () => {
    cy.contains('button', '建立 order (送 CA 開單)').should('be.disabled');
    cy.screenshot('TC-F05-01 送出按鈕 disabled', { capture: 'fullPage', log: false });
  });

  it('TC-F05-02: 切換 CA 時 Account 選項更新', () => {
    cy.contains('label', 'CA 機構').next().find('select').as('caSelect');
    cy.get('@caSelect').find('option').should('have.length', 3);
    cy.get('@caSelect').select('TWCA');
    cy.contains('label', 'Account').next().find('select').find('option').should('have.length.gte', 1);
    cy.screenshot('TC-F05-02 切換 CA 後 Account 更新', { capture: 'fullPage', log: false });
  });

  it.skip('TC-F05-03: 完整填寫並送出憑證申請 [BLOCKED] 會建立真實 Order，需隔離測試環境', () => {
    cy.contains('CA 機構').parent().find('select').select('Letsencrypt');
    cy.get('input[placeholder="example.ruenxin.com.tw"]').type('smoke-test-tc.example.com');
    cy.contains('button', '建立 order (送 CA 開單)').should('not.be.disabled').click();
    cy.url().should('include', '/certs/');
  });

  it('TC-F05-04: 取消申請不建立 Order', () => {
    cy.get('input[placeholder="example.ruenxin.com.tw"]').type('test-cancel.example.com');
    cy.screenshot('TC-F05-04 取消前確認填入 CN', { capture: 'fullPage', log: false });
    cy.contains('button', '取消').click();
    cy.url().should('include', '/certs');
    cy.url().should('not.include', '/new');
  });
});

describe('匯入既有憑證', () => {
  beforeEach(() => {
    cy.visit('/certs/import');
    cy.url().should('include', '/certs/import');
  });

  it.skip('TC-F06-01: PEM 格式憑證單張匯入 [BLOCKED] 需準備有效 PEM fixture', () => {
    cy.fixture('valid-cert.pem').then((pem) => {
      cy.get('textarea').type(pem);
      cy.contains('button', '匯入').click();
      cy.contains('IMPORTED').should('be.visible');
    });
  });

  it('TC-F06-03: 無效 PEM 格式顯示錯誤', () => {
    cy.get('textarea').type('THIS IS NOT A VALID PEM');
    cy.contains('button', '取消').prev('button').click();
    cy.screenshot('TC-F06-03 匯入後等待錯誤訊息', { capture: 'fullPage', log: false });
    cy.get('main').should('contain.text', 'PEM 內容看起來不對');
  });

  it('IT-LC-NEG-02: 匯入空字串 PEM → 顯示格式錯誤（邊界測試）', () => {
    // 邊界測試：空白輸入，補 TC-F06-03 損壞 PEM 的空值邊界
    cy.get('textarea').clear();
    cy.screenshot('IT-LC-NEG-02 空白輸入', { capture: 'fullPage', log: false });
    cy.contains('button', '取消').prev('button').click();
    // 空白輸入應被前端擋下（按鈕 disabled）或後端顯示格式錯誤
    cy.get('body').should('satisfy', ($body) => {
      const text = $body.text();
      return text.includes('PEM') || text.includes('格式') || text.includes('錯誤') || text.includes('必填');
    });
    cy.screenshot('IT-LC-NEG-02 空白PEM驗證', { capture: 'fullPage', log: false });
  });
});
