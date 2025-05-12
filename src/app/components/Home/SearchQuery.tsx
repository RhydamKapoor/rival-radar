"use client";
import axios from "axios";
import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function SearchQuery() {
  const { register, handleSubmit } = useForm();
  const [content, setContent] = useState<{ data: { content: string; images: string[]; name: string; time: string }[]; title: string }>({ data: [], title: "" });
  const [loading, setLoading] = useState<boolean>(false);
  const [type, setType] = useState<string>("");

  const onSubmit = async (data: any) => {
    if (data.search !== "") {
      try {
        setLoading(true);
        const response = await axios.post(`/api/scrape?query=${data.search}`, {
          method: "POST",
        });
  
        if (response.status === 200) {
          const result = response.data.response;
  
          // CASE 1: If response is a string
          if (typeof result === "string") {
            try {
              const maybeParsed = JSON.parse(result);
          
              if (maybeParsed?.data && maybeParsed?.title) {
                setType("object");
                setContent(maybeParsed);
              } else {
                throw new Error("Not a valid object format");
              }
          
            } catch (e) {
              setType("string");
              setContent({
                title: "Response",
                data: [
                  {
                    content: result,
                    images: [],
                    name: "LLM",
                    time: new Date().toLocaleString(),
                  },
                ],
              });
            }
          }
  
          console.log("Parsed response:", result);
          console.log("Type:", type);
        }
      } catch (error: any) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  

  return (
    <div className="flex flex-col items-center h-full w-full gap-y-12 overflow-hidden">
      <form
        className="flex flex-col items-center justify-center w-full"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-center relative w-1/2">
          <input
            type="search"
            id="search"
            placeholder="What has Competitor X released in the past 2 months?"
            {...register("search")}
            className="input input-bordered w-full border-2 border-primary rounded-full px-4 py-2 outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 bg-base-100 rounded-full p-2 h-4/6 flex items-center justify-center cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </form>
      <div className="flex flex-col items-center h-full w-full overflow-y-auto">
        <div className="flex flex-col w-3/4">
          {
            loading ? (
              <div className="flex flex-col h-full items-center">
                <h1>Loading...</h1>
              </div>
            ) : (
              <div className="flex flex-col w-full">
                <h1 className="text-2xl font-bold text-center">{content?.title}</h1>
                <div className={`grid ${ type === "string" ? `grid-cols-1` : `grid-cols-2`} gap-x-12 gap-y-10 h-full p-5`}>
                  {
                    type === "string" ? (
                      <div className="flex flex-col justify-between gap-y-5 p-5 rounded-xl min-h-[400px]">
                        <h3>{content?.data[0]?.content}</h3>
                      </div>
                    ) : (
                      content.data.map((item: { content: string; images: string[]; name: string; time: string }, index: number) => (
                        <div className="flex flex-col justify-between gap-y-5 border p-5 rounded-xl min-h-[400px]" key={index}>
                        <div className="flex flex-col gap-y-3">
                          <p className="text-sm text-gray-500 flex gap-x-3 items-center">
                            <span className="font-bold text-info">{item.name}</span>
                            <span className="text-gray-500">{item.time}</span>
                          </p>
                          <h3>{item.content}</h3>
                        </div>
                        {item?.images?.length > 0 && <img src={item.images[0]} alt={item?.name} className="rounded-lg h-52 w-full object-cover object-top"/>}
                      </div>
                    )))
                  }
                </div>
              </div>
            )
          }

        </div>

      </div>

    </div>
  );
}
