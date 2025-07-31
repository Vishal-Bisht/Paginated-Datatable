import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { useEffect, useState, useRef } from "react";
import "primeicons/primeicons.css";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const Table = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [SelectedRows, setSelectedRows] = useState<Artwork[]>([]);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(12);
  const [remainingRows, setRemainingRows] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  const op = useRef<OverlayPanel>(null);

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${page}`
      );
      const data = await res.json();
      setArtworks(data.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const onPageChange = (e: { first: number; rows: number; page: number }) => {
    setFirst(e.first);
    setRows(e.rows);
    const currentPage = Math.floor(e.first / e.rows) + 1;
    fetchData(currentPage);
  };

  const handleSubmit = () => {
    const numberOfRows = parseInt(inputValue);

    if (isNaN(numberOfRows) || numberOfRows <= 0) {
      alert("Please enter a valid number");
      return;
    }

    setSelectedRows([]);

    selectRows(numberOfRows);

    op.current?.hide();
    setInputValue("");
  };

  const selectRows = (remainingRows: number) => {
    const availableRows = artworks.length;
    const rowsToSelect = Math.min(remainingRows, availableRows);

    const newSelections = artworks.slice(0, rowsToSelect);
    setSelectedRows((prev) => [...prev, ...newSelections]);

    const remaining = remainingRows - rowsToSelect;
    setRemainingRows(remaining);
  };

  useEffect(() => {
    if (remainingRows && artworks) selectRows(remainingRows);
  }, [artworks]);

  const overlayButton = () => {
    return (
      <div className="header-container">
        <div>Title</div>
        <Button
          type="button"
          icon="pi pi-chevron-down"
          onClick={(e) => op.current?.toggle(e)}
          className="p-button-text p-button-md chevron-button"
        />
        <OverlayPanel ref={op}>
          <div className="overlay-panel">
            <input
              type="text"
              value={inputValue}
              placeholder="Select rows.."
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button onClick={handleSubmit}>Submit</button>
          </div>
        </OverlayPanel>
      </div>
    );
  };

  return (
    <div className="table-container">
      <DataTable
        value={loading ? [] : artworks}
        selectionMode={"checkbox"}
        selection={SelectedRows}
        onSelectionChange={(e: any) => setSelectedRows(e.value)}
        dataKey="id"
        tableStyle={{ minWidth: "50rem" }}
        className="data-table"
        emptyMessage={
          loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
                fontSize: "1.2rem",
                color: "#666",
              }}
            >
              Data is loading...
            </div>
          ) : (
            "No data available"
          )
        }
      >
        <Column
          selectionMode="multiple"
          headerStyle={{ width: "3rem" }}
          bodyStyle={{ textAlign: "center", verticalAlign: "middle" }}
        ></Column>
        <Column field="title" header={overlayButton} />
        <Column field="place_of_origin" header="Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start" />
        <Column field="date_end" header="End" />
      </DataTable>
      <Paginator
        first={first}
        rows={rows}
        totalRecords={60}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default Table;
