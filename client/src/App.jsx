import AppRoutes from "./router/routes";
import AuthInitializer from "./components/AuthInitializer";

function App() {

  return (
    <>
      <AuthInitializer />
      <AppRoutes />
    </>
  );

}

export default App
