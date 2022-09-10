import React, {useState} from 'react'
import { GetStaticProps } from 'next';
import Header from '../../components/Header'
import {sanityClient, urlFor} from '../../sanity';
import { Post } from '../../typings';
import PortableText from "react-portable-text";
import { useForm, SubmitHandler } from "react-hook-form";

interface IFormInput{
  _id: string;
  name: string;
  email: string;
  comment: string;
}

interface Props{
  post: Post
}

const Post = ({post}: Props) => {
  const [submitted, setSubmitted] = useState(false);
  const {register, handleSubmit, formState: {errors}} = useForm();

  // console.log(post);

  const onSubmit: SubmitHandler<IFormInput> = async(data)=>{
    fetch('/api/createComment', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(()=>{
      console.log(data);
      setSubmitted(true);
    }).catch((error)=>{
      console.log(error);
      setSubmitted(false);
    })
  }

  return (
    <main>
        <Header/>
        <img 
        className="w-full h-[50vh] object-cover"
        src={urlFor(post.mainImage).url()!}/>

        <article className="max-w-3xl mx-auto p-5">
          <h1 className="text-3xl mt-10 mb-3 text-extrabold">{post.title}</h1>
          <h2 className="text-sm font-light">{post.description}</h2>
          <div className="flex mt-8">
            <img 
            className="w-12 h-12 rounded-full"
            src={urlFor(post.author.image).url()!}/>
            <p className="font-extralight text-sm pl-5">Post by <span className="font-bold">{post.author.name}</span><br/>published at {new Date(post._createdAt).toLocaleString()}</p>
          </div>
          
          <div className="mt-10">
            <PortableText
              dataset={process.env.NEXT_PUBLIC_SANITY_DATASET!}
              projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!}
              content={post.body}
              serializers={
                {
                  h1: (props: any) =>(<h1 className="text-2xl font-bold my-5" {...props}/>),
                  h2: (props: any) =>(<h1 className="text-xl font-bold my-5" {...props}/>),
                  li: ({children}:any) =>(<li className="ml-4 list-disc">{children}</li>),
                  links: ({href, children}:any) =>(<a href={href} className="text-blue-500 hover:underline">{children}</a>),
                  ul: ({children}:any) =>(<ul className="my-10">{children}</ul>),
                }
              }
            /> 
          </div>
        </article>

        <hr className="max-w-lg my-5 mx-auto border border-yellow-500"></hr>
        
        {submitted ? (
          <div className="flex flex-col py-10 my-10 bg-yellow-500 text-white max-w-2xl mx-auto px-10 shadow rounded">
              <h1>Thank you for the comment</h1>
              <p>Comments will be visible here</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col p-5 max-w-2xl mx-auto mb-10">
          <h3 className="text-2xl font-bold mb-5">Comment Here:</h3>

          <input {...register('_id')} type="hidden" name="_id" value={post._id}/>

          <label className="block mb-5">
            <span className="text-gray-700">Name</span>
            <input {...register('name', {required:true})} className="shdow border rounded py-2 px-3 form-input mt-1 block w-full" placeholder="Susheel Kumar" type="text"/>
          </label>

          <label className="block mb-5">
            <span className="text-gray-700">Email</span>
            <input {...register('email', {required:true})} className="shdow border rounded py-2 px-3 form-input mt-1 block w-full" placeholder="Susheel Kumar" type="text"/>
          </label>

          <label className="block mb-5">
            <span className="text-gray-700">Comment</span>
            <textarea {...register('comment', {required:true})} className="shdow border rounded py-2 px-3 form-input mt-1 block w-full" placeholder="Susheel Kumar" rows={8}/>
          </label>

          <div className="flex flex-col p-5">
            {errors.name && <span className="text-red-500">The name field is required</span>}
            {errors.email && <span className="text-red-500">The email field is required</span>}
            {errors.comment && <span className="text-red-500">The comment field is required</span>}
          </div>
          
          <input type="submit" className="shadow border rounded bg-yellow-500 hover:bg-yellow-400 py-5 hover:cursor-pointer"/>
        </form>
        )}

        <div className="flex flex-col p-10 my-10 max-w-2xl mx-auto shadow-yellow-500 space-y-2">
          <h3>Comments:</h3>
          <hr className="pb-2"/>
          {post.comments.map((comment) =>(
            <div key={comment._id}>
              <p><span className="text-yellow-500">{comment.name}</span>: {comment.comment}</p>
            </div>
          ))}
        </div>
        
    </main>
  )
}

export default Post

export const getStaticPaths = async () =>{
  const query = `*[_type == "post"]{
    _id,
    slug{
     current
   }
  }`;

  const posts = await sanityClient.fetch(query);

  const paths = posts.map((post: Post) => ({
    params:{
      slug: post.slug.current
    }
  }));

  return{
    paths,
    fallback: 'blocking'
  }
};

export const getStaticProps: GetStaticProps = async ({params}) => {
  const query = `*[_type == "post" && slug.current == $slug][0]{
    _id,
    createdAt,
    title,
    author->{
    name,
    image
    },
  'comments': *[
    _type == "comment" && post._ref == ^._id && approved == true
  ],
    description,
    mainImage,
    slug,
    body
  }`;

  const post = await sanityClient.fetch(query, {
    slug: params?.slug,
  });

  if(!post){
    return{
      notFound: true
    }
  }

  return {
    props:{
      post, 
    },
    revalidate: 60, //After 60 seconds update old caches
  }
}