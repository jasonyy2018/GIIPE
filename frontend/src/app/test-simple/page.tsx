// 简单的测试页面，用于诊断空白页面问题
export default function TestSimple() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, the server is working.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}

