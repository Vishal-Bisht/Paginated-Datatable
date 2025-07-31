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

interface SelectionMetadata {
  totalRowsToSelect: number;
  selectedIds: number[];
  rowsSelectedSoFar: number;
  isActive: boolean;
  currentPage: number;
}

const Table = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedRows, setSelectedRows] = useState<Artwork[]>([]);
  const [first, setFirst] = useState(0);
  const [rows] = useState(12);
  const [selectionMetadata, setSelectionMetadata] = useState<SelectionMetadata>(
    {
      totalRowsToSelect: 0,
      selectedIds: [],
      rowsSelectedSoFar: 0,
      isActive: false,
      currentPage: 1,
    }
  );
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const op = useRef<OverlayPanel>(null);

  // Initialize from localStorage
  useEffect(() => {
    const savedMetadata = localStorage.getItem("selectionMetadata");
    if (savedMetadata) {
      const metadata = JSON.parse(savedMetadata);
      setSelectionMetadata(metadata);
      // Map selectedIds to Artwork objects for DataTable
      setSelectedRows(
        artworks.filter((artwork) => metadata.selectedIds.includes(artwork.id))
      );
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(
      "selectionMetadata",
      JSON.stringify(selectionMetadata)
    );
    setSelectedRows(
      artworks.filter((artwork) =>
        selectionMetadata.selectedIds.includes(artwork.id)
      )
    );
  }, [selectionMetadata, artworks]);

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

  // Initial fetch
  useEffect(() => {
    fetchData(1);
  }, []);

  const onPageChange = (e: { first: number; rows: number; page: number }) => {
    setFirst(e.first);
    const currentPage = e.page + 1;
    setSelectionMetadata((prev) => ({
      ...prev,
      currentPage,
    }));
    fetchData(currentPage);
  };

  // Process selections on the current page
  const processCurrentPageSelection = () => {
    if (
      !selectionMetadata.isActive ||
      selectionMetadata.rowsSelectedSoFar >= selectionMetadata.totalRowsToSelect
    ) {
      return;
    }

    const remainingToSelect =
      selectionMetadata.totalRowsToSelect - selectionMetadata.rowsSelectedSoFar;
    const availableRows = artworks.length;
    const rowsToSelectOnThisPage = Math.min(remainingToSelect, availableRows);

    if (rowsToSelectOnThisPage > 0) {
      const newSelections = artworks
        .slice(0, rowsToSelectOnThisPage)
        .map((artwork) => artwork.id)
        .filter((id) => !selectionMetadata.selectedIds.includes(id)); // Avoid duplicates

      setSelectionMetadata((prev) => ({
        ...prev,
        selectedIds: [...prev.selectedIds, ...newSelections],
        rowsSelectedSoFar: prev.rowsSelectedSoFar + newSelections.length,
        isActive:
          prev.rowsSelectedSoFar + newSelections.length <
          prev.totalRowsToSelect,
      }));
    }
  };

  // Handle input submission
  const handleSubmit = () => {
    const numberOfRows = parseInt(inputValue);

    if (isNaN(numberOfRows) || numberOfRows <= 0) {
      alert("Please enter a valid number");
      return;
    }

    const currentPage = Math.floor(first / rows) + 1;
    const newMetadata: SelectionMetadata = {
      totalRowsToSelect: numberOfRows,
      selectedIds: [],
      rowsSelectedSoFar: 0,
      isActive: true,
      currentPage,
    };

    setSelectionMetadata(newMetadata);
    setInputValue("");
    op.current?.hide();
  };

  // automatic selection when artworks or page changes, or when selection becomes active
  useEffect(() => {
    if (selectionMetadata.isActive && artworks.length > 0) {
      processCurrentPageSelection();
    }
  }, [artworks, selectionMetadata.currentPage, selectionMetadata.isActive]);

  const onSelectionChange = (e: { value: Artwork[] }) => {
    const selectedArtworks = e.value;
    const newSelectedIds = selectedArtworks.map((artwork) => artwork.id);

    setSelectionMetadata((prev) => {
      const otherPageIds = prev.selectedIds.filter(
        (id) => !artworks.some((artwork) => artwork.id === id)
      );
      const newRowsSelectedSoFar = Math.min(
        prev.totalRowsToSelect,
        otherPageIds.length + newSelectedIds.length
      );

      return {
        ...prev,
        selectedIds: [...otherPageIds, ...newSelectedIds],
        rowsSelectedSoFar: newRowsSelectedSoFar,
        isActive: false, // Stop auto-selection on manual change
      };
    });
  };

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
        selectionMode="checkbox"
        selection={selectedRows}
        onSelectionChange={onSelectionChange}
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
        />
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
