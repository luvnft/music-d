import { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { FrostySDK, edition } from "frosty-sdk";
import { useSigner, useNetwork } from "wagmi";
import { ethers } from "ethers";
import InfoField from "../InfoField";
import { yupResolver } from "@hookform/resolvers/yup";
import { NFTStorage, Blob } from "nft.storage";
import { useRouter } from "next/router";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import yupSchema from "../../lib/yupSchema";
import SaleDates from "./SaleDates";
import handleTxError from "../../lib/handleTxError";

type FormData = {
  collectionName: string;
  symbol: string;
  description: string;
  nftImage: any;
  audioFile: any;
  editionSize: number;
  tokenPrice: string;
  maxTokenPurchase: number;
  royalty: number;
};

const INFINITY = "∞";

const DeployContract = ({ metadata, setMetadata, setDeploymentStep }: any) => {
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const router = useRouter();
  const { openConnectModal } = useConnectModal();

  const methods = useForm<FormData>({
    resolver: yupResolver(yupSchema),
  });
  const {
    register,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors, isValid },
  } = methods;
  const onSubmit = handleSubmit((data) => console.log(data));

  const [isHovering1, setIsHovering1] = useState(false);
  const [isHovering2, setIsHovering2] = useState(false);
  const [isHovering3, setIsHovering3] = useState(false);
  const [isHovering4, setIsHovering4] = useState(false);
  const [isHovering5, setIsHovering5] = useState(false);
  const [saleStart, setSaleStart] = useState(0);
  const [saleEnd, setSaleEnd] = useState(0);
  const [size, setSize] = useState("open" as string);
  const isOpenEdition = useMemo(() => size === ("open" as any), [size]);

  useEffect(() => {
    if (!metadata?.name) return;
  
    // Update values based on metadata
    setValue("collectionName", metadata.name);
    setValue("symbol", metadata.symbol || metadata.artist);
    setValue("editionSize", metadata.editionSize || 11);
    setValue("tokenPrice", metadata.tokenPrice || "0.0111");
    setSaleStart(metadata.saleStart);
    setSaleEnd(metadata.saleEnd);
    setValue("royalty", metadata.royalty);
    setValue("maxTokenPurchase", metadata.maxTokenPurchase);
    setValue("description", metadata.description);
  }, [metadata, setValue]); // Added setValue as a dependency  

  const deployFunction = async () => {
    try {
      if (!signer) {
        console.error("Please connect wallet.");
        openConnectModal?.();
      } else if (chain) {
        // create metadata
        const finalMetadata = {
          description: getValues("description"),
          image: metadata.image,
          name: getValues("collectionName"),
          animation_url: metadata.animation_url,
        };

        // build metadata json file
        const data = JSON.stringify(finalMetadata, null, 1);
        const bytes = new TextEncoder().encode(data);
        const blob = new Blob([bytes], {
          type: "application/json;charset=utf-8",
        });

        // send metadata file to ipfs
        setDeploymentStep(1);
        const client = new NFTStorage({
          token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN || "",
        });
        const ipfs = await client.storeBlob(blob);

        const sdk = new FrostySDK(chain.id, signer);
        let nft;

        const editionSize = isOpenEdition
          ? 9999999999
          : getValues("editionSize");

        setMetadata({
          ...metadata,
          editionSize,
          tokenPrice: getValues("tokenPrice"),
          maxTokenPurchase: getValues("maxTokenPurchase"),
          saleStart,
          saleEnd,
          royalty: getValues("royalty"),
          description: getValues("description"),
          name: getValues("collectionName"),
          symbol: getValues("symbol"),
        });

        const dateToEpochTime = (date: Date) =>
          Math.floor(date.getTime() / 1000);
        const UINT64_MAX = "18446744073709551615";
        const UINT64_MINUS_ONE = ethers.BigNumber.from(UINT64_MAX)
          .sub(1)
          .toString();

        const formattedStartDate = saleStart
          ? dateToEpochTime(new Date(saleStart))
          : 0;

        const formattedEndDate =
          saleEnd > 0
            ? dateToEpochTime(new Date(saleEnd))
            : ethers.BigNumber.from(UINT64_MINUS_ONE);

        try {
          setDeploymentStep(2);
          nft = await edition.deploy(
            sdk,
            getValues("collectionName"), // name
            getValues("symbol"), // symbol
            false, // hasAdjustableCap
            false, // isSoulbound
            editionSize, // maxTokens
            ethers.utils.parseEther(getValues("tokenPrice")), // tokenPrice
            getValues("maxTokenPurchase") || 0, // maxTokensPurchase
            '0x0000000000000000000000000000000000000000000000000000000000000000', //presaleMerkleRoot
            formattedStartDate, // presaleStart
            formattedEndDate, // presaleEnd
            formattedStartDate, // saleStart
            formattedEndDate, // saleEnd
            getValues("royalty") * 100 || 0, // royaltyBPS
            "0x", //payout address
            `ipfs://${ipfs}?`, // contractURI
            `ipfs://${ipfs}?`, // metadataURI
            null, // metadataRendererInit
            null, // tokenGateConfig
            () => {
              setDeploymentStep(3);
            },
            () => {
              setDeploymentStep(4);
            }
          );
        } catch (error) {
          handleTxError(error);
          setDeploymentStep(0);
        } finally {
          if (nft?.address) {
            router.push(
              `https://hq.frosty.app/${chain.id}/Editions/${nft.address}`
            );
          }
        }
      }
      return;
    } catch (error: any) {
      if (error.code === "INSUFFICIENT FUNDS") {
        console.error("get more $$, fren");
      }
    }
  };

  function handleChange(e: any) {
    let value = e.target.value;
    if (value !== "open") {
      setValue("editionSize", 11);
    }
    setSize(value);
  }

  const inputClass = "border border-black text-black rounded-lg p-3";
  return (
    <>
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="gap-4">
          <div className="flex flex-wrap items-center gap-12">
            <div>
              <p className="font-header">Collection Name</p>
              <input
                className={inputClass}
                {...register("collectionName", {
                  required: "Name your collection",
                })}
              />
              <p className="text-sm text-red-600">
                <ErrorMessage errors={errors} name="collectionName" />
              </p>
            </div>

            <div>
              <p className="font-header">Symbol</p>
              <input
                className={inputClass}
                {...register("symbol", {
                  required: "Give your collection a symbol",
                })}
              />
              <p className="text-sm text-red-600">
                <ErrorMessage errors={errors} name="symbol" />
              </p>
            </div>

            <div className="w-full">
              <p className="font-header">Description</p>
              <textarea
                className={`${inputClass} w-1/2`}
                {...register("description", {
                  required: "Please enter a description.",
                })}
              />
              <p className="text-sm text-red-600">
                <ErrorMessage errors={errors} name="description" />
              </p>
            </div>

            <div>
              <div className="flex items-center pb-2">
                <label>Edition Size</label>
                <InfoField
                  isHovering={isHovering1}
                  setIsHovering={setIsHovering1}
                  xDirection={"left"}
                  yDirection={"bottom"}
                  infoText={
                    "Fixed Editions limit the supply of NFTs to whatever value you enter - enter 1 for a 1 of 1 release.  Fixed editions promote scarcity value and are best for rare assets with high financial or cultural value. If you would like unlimited editions, please use Crescendo."
                  }
                />
              </div>
              <div className="relative flex items-center w-full gap-4">
                <select
                  onChange={(e) => handleChange(e)}
                  className="px-3 py-2 rounded-full border border-[#E4E3E7] cursor-pointer text-black"
                  name="editionSize"
                  value={size}
                  id="size"
                >
                  <option value="fixed">Fixed</option>
                  <option value="open">Open</option>
                </select>

                {isOpenEdition ? (
                  <input disabled className={inputClass} value={INFINITY} />
                ) : (
                  <input className={inputClass} {...register("editionSize")} />
                )}

                <p className="absolute text-sm right-3">Editions</p>
              </div>
              <p className="error-text">
                <ErrorMessage errors={errors} name="editionSize" />
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 pb-2">
                <p className="font-header">Purchase Count (Optional)</p>
                <InfoField
                  isHovering={isHovering2}
                  setIsHovering={setIsHovering2}
                  xDirection={"right"}
                  yDirection={"bottom"}
                  infoText={
                    "Enter the number of NFTs each user can mint at one time.."
                  }
                />
              </div>
              <input className={inputClass} {...register("maxTokenPurchase")} />
            </div>

            <div>
              <p className="font-header">Token Price</p>
              <input
                className={inputClass}
                {...register("tokenPrice", {
                  required:
                    "Must set price for token.  Please set to 0 if you wish for your NFTs to be free.",
                })}
              />
              <p className="text-sm text-red-600">
                <ErrorMessage errors={errors} name="tokenPrice" />
              </p>
            </div>

            {/* Frosty contracts support EIP 2981 */}
            <div>
              <div className="flex gap-1 pb-2">
                <p>Creator Royalty (Optional)</p>
                <InfoField
                  isHovering={isHovering3}
                  setIsHovering={setIsHovering3}
                  xDirection={"left"}
                  yDirection={"bottom"}
                  infoText={
                    "Please enter a percentage that you would like to receive from the value of every sale.  We use EIP 2981."
                  }
                />
              </div>
              <div className="relative flex items-center text-black w-fit">
                <input className={inputClass} {...register("royalty")} />
                <p className="absolute text-sm right-3">%</p>
              </div>
            </div>

            <SaleDates
              hovers={{
                isHovering4,
                isHovering5,
                setIsHovering4,
                setIsHovering5,
              }}
              saleStart={saleStart}
              saleEnd={saleEnd}
              setSaleStart={setSaleStart}
              setSaleEnd={setSaleEnd}
            />
          </div>

          <button
            className="flex items-center gap-4 pt-8"
            type="button"
            onClick={() => deployFunction()}
          >
            <input
              type="submit"
              className="px-8 py-2 text-white bg-black rounded-full cursor-pointer hover:bg-opacity-80"
            />
          </button>
        </form>
      </FormProvider>
    </>
  );
};

export default DeployContract;
