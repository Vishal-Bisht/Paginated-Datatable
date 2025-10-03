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
  selectedPages: number[];
  startPage: number;
  endPage: number;
  userInteractedPages: Set<number>; // Track which pages user has manually interacted with
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
      selectedPages: [],
      startPage: 1,
      endPage: 1,
      userInteractedPages: new Set<number>(),
    }
  );
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const op = useRef<OverlayPanel>(null);

  const calculateSelectedPages = (
    totalRows: number,
    rowsPerPage: number
  ): number[] => {
    const fullPages = Math.floor(totalRows / rowsPerPage);
    const remainingRows = totalRows % rowsPerPage;
    const result: number[] = [];

    // Full pages get all rows selected
    for (let i = 0; i < fullPages; i++) {
      result.push(rowsPerPage);
    }

    // remaining rows
    if (remainingRows > 0) {
      result.push(remainingRows);
    }

    return result;
  };

  const getRowsToSelectOnPage = (pageNumber: number): number => {
    if (!selectionMetadata.isActive) return 0;

    if (
      pageNumber < selectionMetadata.startPage ||
      pageNumber > selectionMetadata.endPage
    ) {
      return 0;
    }

    const pageIndex = pageNumber - selectionMetadata.startPage;
    return selectionMetadata.selectedPages[pageIndex] || 0;
  };

  const shouldAutoSelectOnCurrentPage = (): boolean => {
    return (
      selectionMetadata.isActive &&
      selectionMetadata.rowsSelectedSoFar <
        selectionMetadata.totalRowsToSelect &&
      selectionMetadata.currentPage >= selectionMetadata.startPage &&
      selectionMetadata.currentPage <= selectionMetadata.endPage
    );
  };

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
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  };

  const processAutoSelection = () => {
    if (!shouldAutoSelectOnCurrentPage() || artworks.length === 0) {
      return;
    }

    const rowsToSelectOnThisPage = getRowsToSelectOnPage(
      selectionMetadata.currentPage
    );

    if (rowsToSelectOnThisPage === 0) {
      return;
    }

    // if user has already manually interacted with this page
    if (
      selectionMetadata.userInteractedPages.has(selectionMetadata.currentPage)
    ) {
      return;
    }

    // Get IDs of rows that should be selected on this page
    const currentPageRowIdsToSelect = artworks
      .slice(0, rowsToSelectOnThisPage)
      .map((artwork) => artwork.id);

    // Filter out IDs that are already selected
    const newSelections = currentPageRowIdsToSelect.filter(
      (id) => !selectionMetadata.selectedIds.includes(id)
    );

    if (newSelections.length > 0) {
      const newTotalSelected =
        selectionMetadata.selectedIds.length + newSelections.length;

      // deactivate when target is reached or exceeded
      const isStillActive =
        newTotalSelected < selectionMetadata.totalRowsToSelect;

      setSelectionMetadata((prev) => ({
        ...prev,
        selectedIds: [...prev.selectedIds, ...newSelections],
        rowsSelectedSoFar: newTotalSelected,
        isActive: isStillActive,
      }));
    }
  };

  const onPageChange = (e: { first: number; rows: number; page: number }) => {
    setFirst(e.first);
    const newCurrentPage = Math.floor(e.first / e.rows) + 1;

    setSelectionMetadata((prev) => ({
      ...prev,
      currentPage: newCurrentPage,
    }));

    fetchData(newCurrentPage);
  };

  const handleSubmit = () => {
    const numberOfRows = parseInt(inputValue);

    if (isNaN(numberOfRows) || numberOfRows <= 0) {
      alert("Please enter a valid number greater than 0");
      return;
    }

    const currentPage = Math.floor(first / rows) + 1;
    const selectedPagesArray = calculateSelectedPages(numberOfRows, rows);
    const startPage = currentPage;
    const endPage = startPage + selectedPagesArray.length - 1;

    // Clear current selections immediately
    setSelectedRows([]);

    // Reset selection state and start new selection
    const newMetadata: SelectionMetadata = {
      totalRowsToSelect: numberOfRows,
      selectedIds: [],
      rowsSelectedSoFar: 0,
      isActive: true,
      currentPage: startPage,
      selectedPages: selectedPagesArray,
      startPage: startPage,
      endPage: endPage,
      userInteractedPages: new Set<number>(),
    };

    setSelectionMetadata(newMetadata);
    setInputValue("");
    op.current?.hide();
  };

  const onSelectionChange = (e: { value: Artwork[] }) => {
    const selectedArtworks = e.value;
    const currentPageSelectedIds = selectedArtworks.map(
      (artwork) => artwork.id
    );

    // Get IDs of all rows currently visible on this page
    const currentPageRowIds = artworks.map((artwork) => artwork.id);

    // Keep selections from other pages (persistence)
    const otherPageSelectedIds = selectionMetadata.selectedIds.filter(
      (id) => !currentPageRowIds.includes(id)
    );

    const allSelectedIds = [...otherPageSelectedIds, ...currentPageSelectedIds];

    //  user-interacted page
    const currentPageNumber = Math.floor(first / rows) + 1;
    const newUserInteractedPages = new Set(
      selectionMetadata.userInteractedPages
    );
    newUserInteractedPages.add(currentPageNumber);

    const hasCompletedAllPages = currentPageNumber > selectionMetadata.endPage;
    const hasReachedTargetRows =
      allSelectedIds.length >= selectionMetadata.totalRowsToSelect;

    // deactivate the auto select
    const shouldDeactivate = hasCompletedAllPages || hasReachedTargetRows;

    setSelectionMetadata((prev) => ({
      ...prev,
      selectedIds: allSelectedIds, // maintain all selections
      rowsSelectedSoFar: allSelectedIds.length,
      userInteractedPages: newUserInteractedPages,
      isActive: shouldDeactivate ? false : prev.isActive,
    }));
  };

  const updateSelectedRows = () => {
    const selectedArtworks = artworks.filter((artwork) =>
      selectionMetadata.selectedIds.includes(artwork.id)
    );
    setSelectedRows(selectedArtworks);
  };

  // Save selection metadata to localStorage
  const saveToLocalStorage = () => {
    const metadataToSave = {
      ...selectionMetadata,
      userInteractedPages: Array.from(selectionMetadata.userInteractedPages), // Convert Set to Array
    };
    localStorage.setItem("selectionMetadata", JSON.stringify(metadataToSave));
  };

  // Load selection metadata from localStorage

  const loadFromLocalStorage = () => {
    try {
      const savedMetadata = localStorage.getItem("selectionMetadata");
      if (savedMetadata) {
        const metadata = JSON.parse(savedMetadata);
        if (metadata.userInteractedPages) {
          metadata.userInteractedPages = new Set(metadata.userInteractedPages);
        } else {
          metadata.userInteractedPages = new Set<number>();
        }
        setSelectionMetadata(metadata);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData(1);
  }, []);

  // Load selection state from localStorage on component mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  // Save to localStorage whenever selection metadata changes
  useEffect(() => {
    saveToLocalStorage();
  }, [selectionMetadata]);

  useEffect(() => {
    updateSelectedRows();
  }, [artworks, selectionMetadata.selectedIds]);

  // Process automatic selection
  useEffect(() => {
    if (!loading && artworks.length > 0) {
      processAutoSelection();
    }
  }, [
    selectionMetadata.currentPage,
    selectionMetadata.isActive,
    artworks,
    loading,
  ]);

  //auto-selection
  useEffect(() => {
    if (
      selectionMetadata.isActive &&
      selectionMetadata.selectedIds.length === 0 &&
      !loading &&
      artworks.length > 0
    ) {
      processAutoSelection();
    }
  }, [
    selectionMetadata.isActive,
    selectionMetadata.selectedIds.length,
    loading,
    artworks,
  ]);

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
