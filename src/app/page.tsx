import SearchQuery from "./components/Home/SearchQuery";
export default function Home() {
  return (
    <div className="flex flex-col items-center h-full">
      <SearchQuery />
      {/* ScrapeWikipedia is a function, not a component */}
      {/* Commented out until we can properly integrate it */}
      {/* <ScrapeWikipedia searchTerm="React" /> */}
    </div>
  );
}
