import { GetStaticProps } from 'next';
import Head from 'next/head';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { FiCalendar, FiUser } from 'react-icons/fi'
import Link from 'next/link';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({postsPagination, preview}: HomeProps):JSX.Element {
    const [posts, setPosts] = useState<Post[]>(postsPagination.results);
    const [newPage, setNewPage] = useState<string>(postsPagination.next_page);

    function functionNextPage() {
        fetch(newPage)
            .then(response => response.json())
            .then(data => {
                const newPosts = data.results.map((post:Post) => ({
                    uid: post.uid,
                    data: {
                        title: post.data.title,
                        subtitle: post.data.subtitle,
                        author: post.data.author,
                    },
                    first_publication_date: post.first_publication_date
                }));
                setNewPage(data.next_page);
                setPosts([...posts, ...newPosts]);
            })
    }
    return (
        <>
            <Head>
                <title>Inicio | spacetraveling</title>
            </Head>

            <main className={styles.contentContainer}>
                <section className={styles.listPosts}>
                    { posts.map(post => (
                        <div className={styles.post} key={post.uid}>
                            <Link href={`/post/${post.uid}`}>
                                <a>
                                    <h1>{post.data.title}</h1>
                                    <h2>{post.data.subtitle}</h2>
                                    <div className={styles.info}>
                                        <span>
                                            <FiCalendar />
                                            {format(
                                                new Date(post.first_publication_date),
                                                "dd MMM yyyy",
                                                {
                                                    locale: ptBR,
                                                }
                                            )}
                                        </span>
                                        <span> <FiUser /> {post.data.author}</span>
                                    </div>
                                </a>
                            </Link>
                        </div>
                    )) }
                    {newPage && (
                        <button onClick={functionNextPage}>
                            Carregar mais posts
                        </button>
                    )}
                </section>
                {preview && (
                    <aside>
                        <Link href="/api/exit-preview">
                        <a>Sair do modo Preview</a>
                        </Link>
                    </aside>
                )}
            </main>
        </>
    )
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
    preview = false,
    previewData,
}) => {
    const prismic = getPrismicClient();
    const postsResponse = await prismic.query([
        Prismic.predicates.at('document.type', 'post')
    ], {
        fetch: [
            'post.title',
            'post.subtitle',
            'post.author',
            'post.content'
        ],
        pageSize: 3,
        ref: previewData?.ref ?? null,
    });

    const next_page = postsResponse.next_page;

    const posts: Post[] = postsResponse.results.map(post => {
        return {
            uid: post.uid,
            data: {
                title: post.data.title,
                subtitle: post.data.subtitle,
                author: post.data.author,
            },
            first_publication_date: post.first_publication_date
        }
    })

    const postPagination: PostPagination = {
        next_page: next_page,
        results: posts
    }

    const homeProps: HomeProps = {
        postsPagination: postPagination,
        preview: preview,
    }

    return {
        props: {
            ...homeProps,
            preview,
        },
    }
};
