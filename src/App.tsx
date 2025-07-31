import { PrimeReactProvider } from "primereact/api";
import Table from "./components/Table";

const App = () => {
  return (
    <PrimeReactProvider>
      <Table />
    </PrimeReactProvider>
  );
};
export default App;
