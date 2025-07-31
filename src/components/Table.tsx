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
    }
  );
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const op = useRef<OverlayPanel>(null);

  /**
   * Calculate how many rows should be selected on each page
   * Returns an array where each index represents rows to select on that page
   */
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

    // Last page gets remaining rows (if any)
    if (remainingRows > 0) {
      result.push(remainingRows);
    }

    return result;
  };

  /**
   * Get the number of rows that should be selected on a specific page
   */
  const getRowsToSelectOnPage = (pageNumber: number): number => {
    if (!selectionMetadata.isActive) return 0;

    // Check if page is within selection range
    if (
      pageNumber < selectionMetadata.startPage ||
      pageNumber > selectionMetadata.endPage
    ) {
      return 0;
    }

    const pageIndex = pageNumber - selectionMetadata.startPage;
    return selectionMetadata.selectedPages[pageIndex] || 0;
  };

  /**
   * Check if automatic selection should happen on current page
   */
  const shouldAutoSelectOnCurrentPage = (): boolean => {
    return (
      selectionMetadata.isActive &&
      selectionMetadata.rowsSelectedSoFar <
        selectionMetadata.totalRowsToSelect &&
      selectionMetadata.currentPage >= selectionMetadata.startPage &&
      selectionMetadata.currentPage <= selectionMetadata.endPage
    );
  };

  // ============ DATA FETCHING ============

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

  // ============ AUTOMATIC SELECTION LOGIC ============

  /**
   * Automatically select rows on the current page based on selection metadata
   */
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

    // Get IDs of rows that should be selected on this page
    const currentPageRowIds = artworks
      .slice(0, rowsToSelectOnThisPage)
      .map((artwork) => artwork.id);

    // Filter out IDs that are already selected
    const newSelections = currentPageRowIds.filter(
      (id) => !selectionMetadata.selectedIds.includes(id)
    );

    if (newSelections.length > 0) {
      const newTotalSelected =
        selectionMetadata.selectedIds.length + newSelections.length;

      // Automatically deactivate when target is reached or exceeded
      const isStillActive =
        newTotalSelected < selectionMetadata.totalRowsToSelect;

      setSelectionMetadata((prev) => ({
        ...prev,
        selectedIds: [...prev.selectedIds, ...newSelections],
        rowsSelectedSoFar: newTotalSelected,
        isActive: isStillActive, // Auto-deactivate when target reached
      }));
    }
  };

  // ============ EVENT HANDLERS ============

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
    };

    setSelectionMetadata(newMetadata);
    setInputValue("");
    op.current?.hide();
  };

  /**
   * Handle manual selection/deselection by user
   * Ensures persistence across all pages
   */
  const onSelectionChange = (e: { value: Artwork[] }) => {
    const selectedArtworks = e.value;
    const currentPageSelectedIds = selectedArtworks.map(
      (artwork) => artwork.id
    );

    // Keep selections from other pages (persistence)
    const otherPageSelectedIds = selectionMetadata.selectedIds.filter(
      (id) => !artworks.some((artwork) => artwork.id === id)
    );

    // Combine selections from other pages with current page selections
    const allSelectedIds = [...otherPageSelectedIds, ...currentPageSelectedIds];

    // Check deactivation conditions
    const currentPageNumber = Math.floor(first / rows) + 1;
    const hasCompletedAllPages = currentPageNumber > selectionMetadata.endPage;
    const hasReachedTargetRows =
      allSelectedIds.length >= selectionMetadata.totalRowsToSelect;

    // Deactivate auto-selection if:
    // 1. User has completed visiting all required pages, OR
    // 2. Target number of rows has been reached/exceeded
    const shouldDeactivate = hasCompletedAllPages || hasReachedTargetRows;

    setSelectionMetadata((prev) => ({
      ...prev,
      selectedIds: allSelectedIds, // Always maintain all selections
      rowsSelectedSoFar: allSelectedIds.length,
      // Deactivate when conditions are met, otherwise preserve current state
      isActive: shouldDeactivate ? false : prev.isActive,
    }));
  };

  // ============ PERSISTENCE LOGIC ============

  /**
   * Update selectedRows state when artworks or selectedIds change
   * This ensures the DataTable shows the correct selections
   */
  const updateSelectedRows = () => {
    const selectedArtworks = artworks.filter((artwork) =>
      selectionMetadata.selectedIds.includes(artwork.id)
    );
    setSelectedRows(selectedArtworks);
  };

  /**
   * Save selection metadata to localStorage
   */
  const saveToLocalStorage = () => {
    localStorage.setItem(
      "selectionMetadata",
      JSON.stringify(selectionMetadata)
    );
  };

  /**
   * Load selection metadata from localStorage
   */
  const loadFromLocalStorage = () => {
    try {
      const savedMetadata = localStorage.getItem("selectionMetadata");
      if (savedMetadata) {
        const metadata = JSON.parse(savedMetadata);
        setSelectionMetadata(metadata);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  };

  // ============ EFFECTS ============

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

  // Update selected rows when artworks or selectedIds change
  useEffect(() => {
    updateSelectedRows();
  }, [artworks, selectionMetadata.selectedIds]);

  // Process automatic selection when conditions are met
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

  // ============ UI COMPONENTS ============

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
