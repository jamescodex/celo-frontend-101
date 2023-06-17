/* eslint-disable @next/next/no-img-element */
// This component displays and enables the purchase of a product

// Importing the dependencies
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
// Import ethers to format the price of the product correctly
import { ethers } from "ethers";
// Import the useConnectModal hook to trigger the wallet connect modal
import { useConnectModal } from "@rainbow-me/rainbowkit";
// Import the useAccount hook to get the user's address
import { useAccount } from "wagmi";
// Import the toast library to display notifications
import { toast } from "react-toastify";
// Import our custom identicon template to display the owner of the product
import { identiconTemplate } from "@/helpers";
// Import our custom hooks to interact with the smart contract
import { useContractApprove } from "@/hooks/contract/useApprove";
import { useContractCall } from "@/hooks/contract/useContractRead";
import { useContractSend } from "@/hooks/contract/useContractWrite";
import { StarIcon } from "@heroicons/react/24/solid";

// Define the interface for the product, an interface is a type that describes the properties of an object
interface Product {
  name: string;
  price: number;
  owner: string;
  image: string;
  description: string;
  location: string;
  sold: boolean;
  rateCount: number;
  ratersCount: number;
}

// Define the Product component which takes in the id of the product and some functions to display notifications
const Product = ({ id, setError, setLoading, clear }: any) => {
  // Use the useAccount hook to store the user's address
  const { address } = useAccount();

  // Use the useContractCall hook to read the data of the product with the id passed in, from the marketplace contract
  const { data: rawProduct }: any = useContractCall("readProduct", [id], true);
  // Use the useContractSend hook to purchase the product with the id passed in, via the marketplace contract
  const { writeAsync: purchase } = useContractSend("buyProduct", [Number(id)]);
  const [product, setProduct] = useState<Product | null>(null);
  // Use the useContractApprove hook to approve the spending of the product's price, for the ERC20 cUSD contract
  const { writeAsync: approve } = useContractApprove(product?.price?.toString() || "0");
  // Use the useContractSend hook to rate a product in the marketplace
  const {writeAsync} = useContractSend("rateProduct", [Number(id), Number(5)]);
  // use the useContractCall hook to check if user has rated a product
  const {data: rated } = useContractCall("checkRate", [id], true, address);
  // Use the useConnectModal hook to trigger the wallet connect modal
  const { openConnectModal } = useConnectModal();
  // Format the product data that we read from the smart contract
  const getFormatProduct = useCallback(() => {
    if (!rawProduct) return null;
    setProduct({
      owner: rawProduct[0],
      name: rawProduct[1],
      image: rawProduct[2],
      description: rawProduct[3],
      location: rawProduct[4],
      price: Number(rawProduct[5]),
      sold: rawProduct[6].toString(),
      rateCount: Number(rawProduct[7]),
      ratersCount: Number(rawProduct[8])
    });
  }, [rawProduct]);

  // Call the getFormatProduct function when the rawProduct state changes
  useEffect(() => {
    getFormatProduct();
  }, [getFormatProduct]);

  // Define the handlePurchase function which handles the purchase interaction with the smart contract
  const handlePurchase = async () => {
    if (!approve || !purchase) {
      throw "Failed to purchase this product";
    }
    // Approve the spending of the product's price, for the ERC20 cUSD contract
    const approveTx = await approve();
    // Wait for the transaction to be mined, (1) is the number of confirmations we want to wait for
    await approveTx.wait(1);
    setLoading("Purchasing...");
    // Once the transaction is mined, purchase the product via our marketplace contract buyProduct function
    const res = await purchase();
    // Wait for the transaction to be mined
    await res.wait();
  };

  // Define the purchaseProduct function that is called when the user clicks the purchase button
  const purchaseProduct = async () => {
    setLoading("Approving ...");
    clear();

    try {
      // If the user is not connected, trigger the wallet connect modal
      if (!address && openConnectModal) {
        openConnectModal();
        return;
      }
      // If the user is connected, call the handlePurchase function and display a notification
      await toast.promise(handlePurchase(), {
        pending: "Purchasing product...",
        success: "Product purchased successfully",
        error: "Failed to purchase product",
      });
      // If there is an error, display the error message
    } catch (e: any) {
      console.log({ e });
      setError(e?.reason || e?.message || "Something went wrong. Try again.");
      // Once the purchase is complete, clear the loading state
    } finally {
      setLoading(null);
    }
  };

  // Define the handleRateProduct function which handles rate functionality in the marketplace
  const handleRateProduct = async (rateValue: number) => {
    // If the writeAsync function is empty, throw error
    if (!writeAsync) {
      throw "Failed to rate product"
    }
    // If the user has already rated a product, throw error
    if (rated) {
      alert("You have already rated this product")
      throw "Product rated already"
    }
    // Dynamically update the contract call argument using the selected value by the user
    const rateTx = await writeAsync({
      recklesslySetUnpreparedArgs: [Number(id), Number(rateValue)]
    });
    // Wait for the transaction to be mined
    await rateTx.wait();
  }

  // Define a function that get's called on individual rate indicators
  const rateProduct = async (rateValue: number) => {
    setLoading("Rating product ...")
    clear();
    // Open wallet connect window if user is not already connected
    try {
      if (!address && openConnectModal) {
        openConnectModal();
        return;
      }
      // Make call to the handleRateProduct function using the rate value
      await toast.promise(handleRateProduct(rateValue), {
        pending: "Rating product ...",
        success: "You have successfully rated a product",
        error: "Error rating a product"
      })
      // Handle errors that might come up
    } catch (e: any) {
      console.log({e});
      setError(e?.reason || e?.message || rated? "You have already rated this product": "Something went wrong. Please try again.");
    } finally {
      setLoading(null)
    }
  }

  // If the product cannot be loaded, return null
  if (!product) return null;

  // Format the price of the product from wei to cUSD otherwise the price will be way too high
  const productPriceFromWei = ethers.utils.formatEther(
    product.price.toString()
  );

  // Return the JSX for the product component
  return (
    <div className={"rounded border w-[406px] h-[710px] flex flex-col p-2 gap-4 font-sans hover:shadow-lg"}>
      <img
        src={product.image}
        alt={"product image"}
        className="w-full h-80 object-cover object-center rounded-sm hover:rounded-md hover:scale-110 hover:-rotate-3 transition duration-300 ease-in-out"
      />
      <div className="border h-[50%] flex flex-col justify-between rounded p-2">
        <div className="flex gap-2">
          <div className="w-[70%]">
            <div className="text-purple-600 italic">Name</div>
            <div className="border rounded-sm p-2 font-mono font-semibold h-[60px] overflow-hidden text-ellipsis">{product.name}</div>
          </div>
          <div className="w-[30%] flex flex-col items-center">
            <div className="text-purple-600 italic">Created By:</div>
            <Link
              href={`https://explorer.celo.org/alfajores/address/${product.owner}`}
              className={"h-10 w-10 rounded-full bg-green-700"}
              >
                {identiconTemplate(product.owner)}
            </Link>
          </div>
        </div>

        <div className="">
          <div className="text-purple-600 italic">Description</div>
          <div className="border rounded-md p-2 font-mono font-semibold max-h-[100px] text-ellipsis overflow-hidden">{product.description}</div>
        </div>
        <div className="border h-[75px] rounded flex flex-col">
          <div className="flex gap-4 h-[60px] justify-center items-center border">
            <StarIcon className="w-[40px] h-[35px] outline-1 hover:w-[45px] hover:h-[45px] text-yellow-400 cursor-pointer hover:-rotate-[145deg] transition duration-300 ease-in-out" onClick={async () => await rateProduct(Number(1))}/>
            <StarIcon className="w-[40px] h-[35px] outline-1 hover:w-[45px] hover:h-[45px] text-yellow-400 cursor-pointer hover:-rotate-[145deg] transition duration-300 ease-in-out" onClick={async () => await rateProduct(Number(2))}/>
            <StarIcon className="w-[40px] h-[35px] outline-1 hover:w-[45px] hover:h-[45px] text-yellow-400 cursor-pointer hover:-rotate-[145deg] transition duration-300 ease-in-out" onClick={async () => await rateProduct(Number(3))}/>
            <StarIcon className="w-[40px] h-[35px] outline-1 hover:w-[45px] hover:h-[45px] text-yellow-400 cursor-pointer hover:-rotate-[145deg] transition duration-300 ease-in-out" onClick={async () => await rateProduct(Number(4))}/>
            <StarIcon className="w-[40px] h-[35px] outline-1 hover:w-[45px] hover:h-[45px] text-yellow-400 cursor-pointer hover:-rotate-[145deg] transition duration-300 ease-in-out" onClick={async () => await rateProduct(Number(5))}/>
          </div>
          <div className="ml-2">
            Product rating: {product.rateCount/product.ratersCount}
          </div>
        </div>
        <div className="border rounded h-[60px] flex justify-around items-center">
          {/* Display the number of times this product has been sold */}
          <div className="text-purple-600">Sold: <span className="font-mono font-semibold text-black">{product.sold}</span></div>
          {/* Programmatically display the button or text depending on the role of the logged in user */}
          {product.owner == address ? (<div>You are owner</div>) : (
            <button onClick={purchaseProduct} className="font-semibold rounded-lg text-white font-mono bg-purple-600 w-40 h-10 hover:bg-slate-600">
              Buy ({productPriceFromWei} cUSD)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Product;