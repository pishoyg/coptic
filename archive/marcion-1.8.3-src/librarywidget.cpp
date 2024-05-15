/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "ui_librarywidget.h"
#include "librarywidget.h"

QString CLibraryWidget::diritem=QString();
QTreeWidgetItem * CLibraryWidget::dir_t_item(0);

int CLibraryWidget::newBid(-1);
int CLibraryWidget::newCid(-1);
int CLibraryWidget::newLid(-1);

bool CLibraryWidget::_hidden_files(false);

CLibraryWidget::CLibraryWidget(CMessages * const messages,
                               MLibTitle & libtitle,
                               QWidget *parent) :
    QWidget(parent),
    CLibBase(),
    ui(new Ui::CLibraryWidget),
    messages(messages),
    is_loaded(false),
    popup(),popupHtml(),popupTLG(),
    popupFind(),popupDrag(),/*popupEncoding(tr("encoding")),*/
    popupOpenAs(tr("o&pen as")),
    coll1_items(),op_OK(false),
    cut_s(),copy_s(),
    _libtitle(libtitle),
    f_files(),drag_items(),
    _clipboard(),
    rtfd(10,false)
{
    ui->setupUi(this);

    ui->treeFiles->setItemDelegateForColumn(0,&rtfd);
    ui->wdgFind->hide();

    ui->cmbFindFile->completer()->setCaseSensitivity(Qt::CaseSensitive);
    ui->cmbFindFile->completer()->setCompletionMode(QCompleter::PopupCompletion);

    open_book=popup.addAction(tr("&open book"));
    open_book->setShortcut(QKeySequence("Ctrl+O"));
    popup.addSeparator();
    expand=popup.addAction(tr("&expand"));
    collapse=popup.addAction(tr("&collapse"));
    expand_all=popup.addAction(tr("e&xpand all"));
    collapse_all=popup.addAction(tr("co&llapse all"));
    popup.addSeparator();
    bkp_book=popup.addAction(tr("backup collection"));
    del_book=popup.addAction(tr("delete collection"));
    popup.addSeparator();
    QMenu * m=popup.addMenu(tr("&index"));
    (show_index=m->addAction(tr("show")))->setCheckable(true);
    show_index->setChecked(false);
    chk_index=m->addAction(tr("check index"));
    chk_index_all=m->addAction(tr("check all"));
    cr_index=m->addAction(tr("create index"));
    m->addSeparator();
    drop_index=m->addAction(tr("drop index"));
    drop_all=m->addAction(tr("drop all indexes"));
    popup.addSeparator();
    reload_tree=popup.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("&reload tree"));

    /*if(messages->settings().isCopticEditable())
    {*/
        popup.addSeparator();
        //book_id=popup.addAction("copy book id");
        a_newlang=popup.addAction(tr("create new language"));
        a_rmlang=popup.addAction(tr("delete language"));
        a_crnewc=popup.addAction(tr("create new collection"));
        a_crnewb=popup.addAction(tr("create new book"));
        a_rmbook=popup.addAction(tr("delete book"));
        a_edb=popup.addAction(tr("edit book"));
        //popup.addSeparator();
    //}
    /*popup.addSeparator();
    drop_library=popup.addAction(tr("delete entire library"));*/
        a_newlang->setVisible(false);
        a_rmlang->setVisible(false);
        a_crnewc->setVisible(false);
        a_crnewb->setVisible(false);
        a_edb->setVisible(false);
        a_rmbook->setVisible(false);

    open_book_h=popupHtml.addAction(tr("&open"));
    open_book_h->setShortcut(QKeySequence("Ctrl+O"));

    a_ashtml=popupOpenAs.addAction(QIcon(":/new/icons/icons/html_file.png"),"&html");
    a_astxt=popupOpenAs.addAction(QIcon(":/new/icons/icons/txt_file.png"),"&txt");
    a_asdjvu=popupOpenAs.addAction(QIcon(":/new/icons/icons/djvu_icon.png"),"&djvu");
    a_aspdf=popupOpenAs.addAction(QIcon(":/new/icons/icons/pdf_icon.png"),"&pdf");
    a_astr=popupOpenAs.addAction(QIcon(":/new/icons/icons/html_file.png"),"&ilt.html");
    a_asimg=popupOpenAs.addAction(QIcon(":/new/icons/icons/image.png"),"i&mage");
    popupOpenAs.addSeparator();
    a_edittxt=popupOpenAs.addAction(QIcon(":/new/icons/icons/txt_file.png"),tr("edit &as txt"));

    popupHtml.addMenu(&popupOpenAs);

    popupHtml.addSeparator();
    expand_h=popupHtml.addAction(tr("&expand"));
    collapse_h=popupHtml.addAction(tr("&collapse"));
    expand_all_h=popupHtml.addAction(tr("e&xpand all"));
    collapse_all_h=popupHtml.addAction(tr("co&llapse all"));
    popupHtml.addSeparator();
    reload_tree_h=popupHtml.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("&reload tree"));
    a_show_hidden=popupHtml.addAction(tr("sho&w hidden files"));
    a_show_hidden->setCheckable(true);
    a_show_hidden->setChecked(_hidden_files);
    popupHtml.addSeparator();
    QMenu * m2=popupHtml.addMenu(QIcon(":/new/icons/icons/folderwork.png"),tr("&index"));
    (show_index_h=m2->addAction(tr("&show/hide")))->setCheckable(true);
    show_index_h->setChecked(false);
    cr_index_h=m2->addAction(QIcon(":/new/icons/icons/folderwork.png"),tr("(re)&create index"));
    drop_index_h=m2->addAction(tr("&drop index"));
    //popupHtml.addMenu(createEncMenu());
    popupHtml.addSeparator();
    downloadweb_h=popupHtml.addAction(QIcon(":/new/icons/icons/downweb.png"),tr("&download web"));
    find_file=popupHtml.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("&Find file(s)"));
    find_file->setShortcut(QKeySequence("Shift+F"));
    find_file->setCheckable(true);
    //find_file->setChecked(false);
    popupHtml.addSeparator();
    create_dir_h=popupHtml.addAction(tr("cre&ate directory"));
    rename_h=popupHtml.addAction(tr("rena&me directory/file"));
    create_dir_h->setShortcut(QKeySequence("Ctrl+Ins"));
    rm_dir_h=popupHtml.addAction(QIcon(":/new/icons/icons/delete.png"),tr("dele&te directory/file"));
    rm_dir_h->setShortcut(QKeySequence("Ctrl+Del"));
    popupHtml.addSeparator();
    a_cutfd=popupHtml.addAction(QIcon(":/new/icons/icons/cut.png"),tr("c&ut"));
    a_copyfd=popupHtml.addAction(QIcon(":/new/icons/icons/copy.png"),tr("cop&y"));
    a_pastefd=popupHtml.addAction(QIcon(":/new/icons/icons/paste.png"),tr("pa&ste"));
    a_printfd=popupHtml.addAction(QIcon(":/new/icons/icons/info.png"),tr("pri&nt clipboard"));

    tlg_open_book=popupTLG.addAction(tr("open"));
    popupTLG.addSeparator();
    tlg_expand=popupTLG.addAction(tr("expand"));
    tlg_collapse=popupTLG.addAction(tr("collapse"));
    tlg_expand_all=popupTLG.addAction(tr("expand all"));
    tlg_collapse_all=popupTLG.addAction(tr("collapse all"));
    popupTLG.addSeparator();
    tlg_reload=popupTLG.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("reload tree"));

    a_open2=popupFind.addAction(tr("&open file"));
    popupFind.addSeparator();
    a_clear2=popupFind.addAction(tr("&clear list"));


    a_dd_copy=popupDrag.addAction(QIcon(":/new/icons/icons/copy.png"),tr("&copy here"));
    a_dd_cut=popupDrag.addAction(QIcon(":/new/icons/icons/paste.png"),tr("&move here"));

    ui->treeLibrary->hideColumn(1);
    ui->treeLibrary->hideColumn(2);
    ui->treeLibrary->hideColumn(3);

    ui->treeHtmlLib->hideColumn(2);
    ui->treeHtmlLib->hideColumn(3);

    ui->treeTLG->hideColumn(1);
    ui->treeTLG->hideColumn(2);

    //ui->treeFiles->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeHtmlLib->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeLibrary->header()->setResizeMode(QHeaderView::ResizeToContents);

    TT_BUTTONS
}

CLibraryWidget::~CLibraryWidget()
{
    delete ui;
}

//

void CLibraryWidget::keyPressEvent(QKeyEvent * event)
{
    event->ignore();

    if(event->modifiers()==Qt::ControlModifier)
    {
        switch(ui->tabLibrary->currentIndex())
        {
        case 0:
            switch(event->key())
            {
            case Qt::Key_O :
                openBooks();
                event->accept();
                break;
            default:
                break;
            }
            break;
        case 1:
            switch(event->key())
            {
            /*case Qt::Key_F :
                findFileDialogSwitch();
                event->accept();
                break;*/
            case Qt::Key_O :
                openHtmlBooks();
                event->accept();
                break;
            case Qt::Key_Insert :
                mkDir();
                event->accept();
                break;
            case Qt::Key_Delete :
            {
                QList<QTreeWidgetItem*> li=ui->treeHtmlLib->selectedItems();
                delHtmlDir(&li);
                event->accept();
                break;
            }
            default:
                break;
            }
            break;
        default:
            break;
        }
    }

    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CLibraryWidget::activateLibType(int lib_type)
{
    switch(lib_type)
    {
    case 0 :
        if(ui->tabLibrary->widget(0)->isEnabled())
            ui->tabLibrary->setCurrentIndex(0);
        break;
    case 1 :
        if(ui->tabLibrary->widget(1)->isEnabled())
        {
            ui->tabLibrary->setCurrentIndex(1);
        }
        break;
    case 2 :
        if(ui->tabLibrary->widget(2)->isEnabled())
            ui->tabLibrary->setCurrentIndex(2);
        break;
    }
}

bool CLibraryWidget::load_tree(MProgressIcon * p_icon)
{

    USE_CLEAN_WAIT

    coll1_items.clear();

    if(p_icon)
    {
        QString const queryc("select count(*) from `library_book`");
        MQUERY_GETFIRST_RF(qc,queryc);

        int const reccount(qc.value(0).toInt());
        p_icon->setMaximumPart(reccount);
    }

    CMySql q;
    QString query("select * from `library_script` order by `name`");

    messages->MsgMsg(tr("loading library:"));
    messages->MsgMsg(tr("executing query '")+query+"' ...");
    if(!q.exec(query))
    {
        messages->MsgErr(q.lastError());

        return is_loaded=false;
    }

    QTreeWidgetItem * expi=0;
    while(q.next())
    {
        QTreeWidgetItem * topi=new CLibItem(q.value(0).toInt(),0,0,
                                 CLibItem::Script);
        QString sc_id=q.value(0);
        topi->setText(0,q.value(1));
        topi->setIcon(0,QIcon(":/new/icons/icons/alef.png"));
        CMySql q9;
        QString query9("select * from `library_lang` where `script`="+sc_id+" order by `name`");

        messages->MsgMsg(tr("executing query '")+query9+"' ...");
        if(!q9.exec(query9))
        {
            messages->MsgErr(q9.lastError());

            return is_loaded=false;
        }

        while(q9.next())
        {
            int id=q9.value(0).toInt();
            QTreeWidgetItem * langi= new CLibItem(id,0,0,CLibItem::Lang);

            if(id==newLid)
                expi=langi;

            QString lang_id=QString::number(id),ltext(q9.value(1));
            langi->setText(0,ltext);
            langi->setIcon(0,QIcon(":/new/icons/icons/forked.png"));
            langi->setToolTip(0,ltext);

            CMySql q2;
            QString query2("select * from `library_collection` where `lang`="+lang_id+" order by `name`");

            messages->MsgMsg(tr("executing query '")+query2+"' ...");
            if(!q2.exec(query2))
            {
                messages->MsgErr(q2.lastError());

                return is_loaded=false;
            }
            while(q2.next())
            {
                int id(q2.value(0).toInt());
                QTreeWidgetItem * coli=new CLibItem(id,q2.value(3).toInt(),0,CLibItem::Col1,q2.value(5).toShort(),q2.value(6).toShort());

                if(id==newCid)
                    expi=coli;

                QString col_id=QString::number(id),ctext(q2.value(1));
                coli->setText(0,ctext);
                coli->setIcon(0,QIcon(":/new/icons/icons/books.png"));
                //initIndexInfo(coli);
                coli->setToolTip(0,ctext);

                CMySql q3;
                QString query3("select * from `library_book` where `collection`="+col_id+" order by `ord`");
                messages->MsgMsg(tr("executing query '")+query3+"' ...");

                if(!q3.exec(query3))
                {
                    messages->MsgErr(q3.lastError());

                    return is_loaded=false;
                }
                while(q3.next())
                {
                    int id(q3.value(0).toInt());
                    QString txt(q3.value(2));
                    QTreeWidgetItem * booki=new CLibItem(id,0,0,CLibItem::Book1);

                    if(id==newBid)
                        expi=booki;

                    booki->setText(0,txt);
                    booki->setToolTip(0,txt);
                    booki->setIcon(0,QIcon(":/new/icons/icons/book2.png"));

                    coli->addChild(booki);
                    if(p_icon)
                        p_icon->incValuePart();
                }

                langi->addChild(coli);
                coll1_items.append(coli);
            }

            topi->addChild(langi);
        }

        ui->treeLibrary->addTopLevelItem(topi);
    }

    newCid=newBid=newLid=-1;
    if(expi)
    {
        ui->treeLibrary->clearSelection();
        expi->setSelected(true);
        ui->treeLibrary->setCurrentItem(expi);
        expi->setExpanded(true);
    }

    messages->MsgOk();

    if(p_icon)
        p_icon->incValue();

    if(m_sett()->checkMysqlIndexes())
        checkIndex(true,p_icon);
    else
        m_msg()->MsgMsg(tr("checking indexes of main library ... skipped"));
    return is_loaded=true;
}

QTreeWidget * CLibraryWidget::htmlTree()
{
    return ui->treeHtmlLib;
}

void CLibraryWidget::on_treeLibrary_customContextMenuRequested(QPoint )
{
    bool const sel(ui->treeLibrary->selectedItems().count()>0);
    open_book->setEnabled(sel);

    a_newlang->setEnabled(false);
    a_rmlang->setEnabled(false);
    a_crnewc->setEnabled(false);
    a_crnewb->setEnabled(false);
    a_edb->setEnabled(false);
    a_rmbook->setEnabled(false);

    CLibItem * i(0);
    if(messages->settings().isCopticEditable())
    {
        a_newlang->setVisible(true);
        a_rmlang->setVisible(true);
        a_crnewc->setVisible(true);
        a_crnewb->setVisible(true);
        a_edb->setVisible(true);
        a_rmbook->setVisible(true);

        if(sel)
        {
            i=(CLibItem *)ui->treeLibrary->selectedItems().first();

            if(i)
            {
                if(i->type==CLibItem::Script)
                    a_newlang->setEnabled(true);
                if(i->type==CLibItem::Lang)
                {
                    a_crnewc->setEnabled(true);
                    a_rmlang->setEnabled(true);
                }
                else if(i->type==CLibItem::Col1)
                    a_crnewb->setEnabled(true);
                else if(i->type==CLibItem::Book1)
                {
                    a_edb->setEnabled(true);
                    a_rmbook->setEnabled(true);
                }
            }
        }
    }

    QAction * a;
    popup.setActiveAction(open_book);
    if((a=popup.exec()))
    {
        if(a==reload_tree)
            reloadTree();
        else if(a==del_book)
            deleteCollection();
        else if(a==bkp_book)
            backupBook();
        else if(a==open_book)
            openBooks();
        else if(a==chk_index)
            checkIndex(false);
        else if(a==chk_index_all)
            checkIndex(true);
        else if(a==show_index)
            showIndexState();
        else if(a==drop_index)
            dropIndex();
        else if(a==cr_index)
            createIndexes();
        else if(a==drop_all)
            dropAll();
        else if(a==drop_library)
            dropEntireLibrary();
        else if(a==expand)
            ui->treeLibrary->expand(ui->treeLibrary->currentIndex());
        else if(a==collapse)
            ui->treeLibrary->collapse(ui->treeLibrary->currentIndex());
        else if(a==expand_all)
            ui->treeLibrary->expandAll();
        else if(a==collapse_all)
            ui->treeLibrary->collapseAll();
        /*else if(a==book_id)
            copyBookId();*/
        else if(a==a_crnewc)
            createNewCol(i);
        else if(a==a_crnewb)
            createNewBook(i);
        else if(a==a_edb)
            editBook(i);
        else if(a==a_rmbook)
            removeBook(i);
        else if(a==a_newlang)
            createNewLang(i);
        else if(a==a_rmlang)
            removeLang(i);
    }
}

void CLibraryWidget::reloadTree(MProgressIcon * p_icon)
{
    ui->treeLibrary->clear();

    is_loaded=false;
    load_tree(p_icon);
}
void CLibraryWidget::backupBook() const
{
    QList<QTreeWidgetItem*> di=ui->treeLibrary->selectedItems();

    QList<CLibItem*> dli;
    QTreeWidgetItem* i;
    foreach(i,di)
    {
        CLibItem * li((CLibItem*)i);
        if(li->type==CLibItem::Col1)
            dli.append(li);
    }
    if(dli.size()>0)
    {
        QString txt,wh;
        CLibItem * li;
        foreach(li,dli)
        {
            txt.append(li->text(0)+"\n");
            wh.append("`library_collection`.`id`="+QString::number(li->id)+" or ");
        }
        wh.remove(QRegExp(" or $"));

        QMessageBox mb(QMessageBox::Question,tr("backup collection(s)"),tr("Backuping collection(s):\n\n")+txt+tr("\n\nContinue?"),QMessageBox::Cancel|QMessageBox::Yes);
        if(mb.exec()==QMessageBox::Yes)
        {
            QFileDialog fd(0,tr("backup file"),QDir::toNativeSeparators("data/backup"),"sql files (*.msql);;all files (*)");
            fd.setFileMode(QFileDialog::AnyFile);
            fd.setAcceptMode(QFileDialog::AcceptSave);
            fd.setDefaultSuffix("msql");

            if(fd.exec())
            {
                QString fn(fd.selectedFiles().first());

                QFile f(fn);
                if(!f.open(QIODevice::WriteOnly))
                {
                    messages->MsgErr(tr("cannot open file \"")+fn+"\"");

                    return;
                }

                CProgressDialog pd;
                pd.show();

                QString query1("select `id`,quote(`name`),`script`,`lang`,`branch`,`spec_index`,`format` from `library_collection` where "+wh+" order by `id`");
                QString query2("select `library_book`.`id`,`library_book`.`collection`,quote(`library_book`.`name`),`library_book`.`ord` from `library_collection` inner join `library_book` on `library_collection`.`id`=`library_book`.`collection` where "+wh+" order by `ord`");
                QString query3("select `library`.`book`,`library`.`chapter`,`library`.`verse`,quote(`library`.`text`) from `library_collection` inner join `library_book` on `library_collection`.`id`=`library_book`.`collection` inner join `library` on `library_book`.`id`=`library`.`book` where "+wh+" order by `book`,`chapter`,`verse`");

                CMySql  q1(query1),
                        q2(query2),
                        q3(query3);

                messages->MsgMsg(tr("executing query '")+query1+"' ...");
                if(!q1.exec())
                {
                    messages->MsgErr(q1.lastError());
                    f.close();

                    return;
                }

                pd.initProgress(tr("backup (stage 1) ..."),q1.size());

                while(q1.next())
                {
                    QString line("insert into `library_collection` (`id`,`name`,`script`,`lang`,`branch`,`spec_index`,`format`) values ("+q1.value(0)+","+q1.value(1)+","+q1.value(2)+","+q1.value(3)+",NULL,"+q1.value(5)+","+q1.value(6)+")"+CMySql::delimiter);

                    if(!f.write(line.toUtf8()))
                    {
                        f.close();
                        messages->MsgErr(tr("cannot write into file \"")+fn+"\"");

                        return;
                    }
                    if(pd.stopped())
                    {
                        pd.close();
                        messages->MsgInf(tr("progress interrupted"));
                        return;
                    }
                    pd.incProgress();
                }
                messages->MsgMsg(tr("executing query '")+query2+"' ...");
                if(!q2.exec())
                {
                    messages->MsgErr(q2.lastError());
                    f.close();

                    return;
                }


                pd.initProgress(tr("backup (stage 2) ..."),q2.size());

                while(q2.next())
                {
                    QString line("insert into `library_book` (`id`,`collection`,`name`,`ord`) values ("+q2.value(0)+","+q2.value(1)+","+q2.value(2)+","+q2.value(3)+")"+CMySql::delimiter);

                    if(!f.write(line.toUtf8()))
                    {
                        f.close();
                        messages->MsgErr(tr("cannot write into file \"")+fn+"\"");

                        return;
                    }
                    if(pd.stopped())
                    {
                        messages->MsgInf(tr("progress interrupted"));
                        return;
                    }
                    pd.incProgress();
                }
                messages->MsgMsg(tr("executing query '")+query3+"' ...");

                if(!q3.exec())
                {
                    messages->MsgErr(q3.lastError());
                    f.close();

                    return;
                }

                pd.initProgress(tr("backup (stage 2) ..."),q3.size());

                while(q3.next())
                {
                    QString line("insert into `library` (`book`,`chapter`,`verse`,`text`) values ("+q3.value(0)+","+q3.value(1)+","+q3.value(2)+","+q3.value(3)+")"+CMySql::delimiter);

                    if(!f.write(line.toUtf8()))
                    {
                        f.close();
                        messages->MsgErr(tr("cannot write into file \"")+fn+"\"");

                        return;
                    }
                    if(pd.stopped())
                    {
                        messages->MsgInf(tr("progress interrupted"));
                        return;
                    }
                    pd.incProgress();
                }

                f.close();
                messages->MsgMsg(tr("operation completed"));

                messages->MsgOk();
            }
        }
    }
    else
        messages->MsgWarn(tr("no collection selected"));
}

void CLibraryWidget::deleteCollection()
{
    QList<QTreeWidgetItem*> di=ui->treeLibrary->selectedItems();

    QList<CLibItem*> dli;
    QTreeWidgetItem* i;
    foreach(i,di)
    {
        CLibItem * li((CLibItem*)i);
        if(li->type==CLibItem::Col1)
            dli.append(li);
    }

    if(dli.size()>0)
    {
        QString txt,wh;
        CLibItem * li;
        foreach(li,dli)
        {
            txt.append(li->text(0)+"\n");
            wh.append("`library_collection`.`id`="+QString::number(li->id)+" or ");
        }
        wh.remove(QRegExp(" or $"));

        QMessageBox mb(QMessageBox::Question,tr("library"),tr("Deleting collection(s):\n\n")+txt+tr("\n\nContinue?"),QMessageBox::Yes|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            USE_CLEAN_WAIT
            QString query("delete from `library_collection`,`library_book`,`library`,`library_index`,`library_iword` using `library_collection` left join `library_book` on `library_collection`.`id`=`library_book`.`collection` left join `library` on `library_book`.`id`=`library`.`book` left join `library_index` on `library`.`i_key`=`library_index`.`key` left join `library_iword` on `library_index`.`key`=`library_iword`.`i_key` where "+wh);
            MQUERY(le,QString("set @libexists=false"))

            CMySql q(query);
            messages->MsgMsg(tr("executing query '")+query+"' ...");
            if(!q.exec())
            {
                messages->MsgErr(q.lastError());

                return;
            }


            messages->MsgInf(tr("collection(s) deleted"));
            messages->MsgOk();
            reloadTree();
            emit indexChanged(CLibSearchBase::MySql);
        }
    }
    else
        messages->MsgWarn(tr("no collection selected"));
}

void CLibraryWidget::on_treeLibrary_itemDoubleClicked(QTreeWidgetItem* item, int)
{
    CLibItem * l_item((CLibItem*)item);

    if(l_item->type==CLibItem::Book1)
    {
        USE_CLEAN_WAIT

        CLibItem * l_itemcol((CLibItem*)l_item->parent());
        CLibItem * i((CLibItem*)item);
        do{
            if((i=(CLibItem*)i->parent())==0)
                return;
        }while(i->type!=CLibItem::Script);


        MVersedBook * b= new MVersedBook(item->text(0),(MVersedBook::Script)i->id,
(MVersedBook::TextFormat)l_itemcol->format,l_item->id);

        if(b)
        {
            QString fbn(((CLibItem*)item->parent())->text(0)+" | "+item->text(0));
            b->setWindowTitle(fbn);
            //m_sett()->mdiArea()->addSubWindow(b)->setWindowIcon(QIcon(":/new/icons/icons/book2.png"));
            //b->setWindowIcon(QIcon(":/new/icons/icons/book2.png"));
            b->show();
            messages->MsgMsg(tr("book opened: ")+fbn,true);
            //activateWindow();

            m_sett()->wnds()->addNewWindow(b);
            CSettings::recentFiles.prependFileItem(MFileItem(fbn,l_item->id,0,0,(unsigned int)i->id));
        }
    }
}

void CLibraryWidget::openBooks()
{
    QList<QTreeWidgetItem*> di=ui->treeLibrary->selectedItems();
    QTreeWidgetItem * i;
    foreach(i,di)
        if(((CLibItem*)i)->type!=CLibItem::Book1)
            di.removeOne(i);

    if(di.count()>1)
    {
        QMessageBox mb(QMessageBox::Question,tr("open books"),tr("Open ")+QString::number(di.count())+tr(" books?"),QMessageBox::Open|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Cancel)
            return;
    }

    foreach(i,di)
        if(((CLibItem*)i)->type==CLibItem::Book1)
            on_treeLibrary_itemDoubleClicked(i,0);
}

bool CLibraryWidget::checkIndex(bool all,MProgressIcon * p_icon) const
{
    USE_CLEAN_WAIT

    QList<QTreeWidgetItem*> di;
    if(all)
    {
        m_msg()->MsgMsg(tr("checking indexes of main library ..."));
        di=coll1_items;
        if(p_icon)
        {
            p_icon->setMaximumPart(di.count());
            p_icon->setValuePart(0);
        }
    }
    else
        di=ui->treeLibrary->selectedItems();

    QTreeWidgetItem * i;
    int oki(0),noi(0),corri(0);
    foreach(i,di)
        if(((CLibItem*)i)->type==CLibItem::Col1)
        {
            QString collection(QString::number(((CLibItem*)i)->id));
            QString query1("call check_index("+collection+",@specindex,@lib,@ind,@diff,@words)");
            QString query2("select @specindex as `spec_index`,@lib as `lib_count`,@ind as `index_count`,@diff as `diff`,@words as `words`");
            MQUERY_RF(q,query1)
            MQUERY_RF(q2,query2)
            if(!q2.first())
            {
                messages->MsgErr(tr("something wrong!"));

                return false;
            }

            unsigned short itype=q2.value(0).toUShort();
            unsigned int lib=q2.value(1).toUInt(),
                ind=q2.value(2).toUInt(),
                diff=q2.value(3).toUInt(),
                wrds=q2.value(4).toUInt();

            messages->MsgMsg(tr("collection id: ")+collection+tr("\nrows in library: ")+QString::number(lib)+tr("\nin index: ")+QString::number(ind)+tr("\nwords: ")+QString::number(wrds)+tr("\ndiff: ")+QString::number(diff));

            switch(itype)
            {
                case 1 :
                i->setText(1,tr("Simple"));
                break;
                case 2 :
                i->setText(1,tr("Extended"));
                break;
            }

            if(ind==0)
            {
                i->setText(2,tr("No"));
                i->setText(3,tr("No"));

                i->setIcon(2,QIcon(":/new/icons/icons/uncheck.png"));
                i->setIcon(3,QIcon(":/new/icons/icons/exclam.png"));
                noi++;
                goto endf;
            }
            if(diff==0)
            {

                i->setText(2,tr("Ok"));
                i->setText(3,tr("Yes"));

                i->setIcon(2,QIcon(":/new/icons/icons/greencheck.png"));
                i->setIcon(3,QIcon(":/new/icons/icons/greencheck.png"));
                oki++;
            }
            else
            {
                i->setText(2,tr("Corrupted"));
                i->setText(3,tr("Uncertain"));

                i->setIcon(2,QIcon(":/new/icons/icons/exclam.png"));
                i->setIcon(3,QIcon(":/new/icons/icons/qmark.png"));
                corri++;
            }
endf:
            messages->MsgOk();

            if(p_icon)
                p_icon->incValuePart();
        }



    QString tmsg(tr("checked indexes: ")+QString::number(di.count())+"\n\n");
    QSystemTrayIcon::MessageIcon mi(QSystemTrayIcon::Warning);
    if(noi>0)
        tmsg.append(QString::number(noi)+tr(" without index\n"));
    if(corri>0)
        tmsg.append(QString::number(corri)+tr(" corrupted"));
    if(noi==0&&corri==0)
    {
        tmsg.append(tr("All OK."));
        mi=QSystemTrayIcon::Information;
    }

    messages->trayIcon()->showMessage(tr("mysql library indexes"),tmsg,mi);
    return true;
}

void CLibraryWidget::showIndexState()
{
    ui->treeLibrary->setColumnHidden(1,!show_index->isChecked());
    ui->treeLibrary->setColumnHidden(2,!show_index->isChecked());
    ui->treeLibrary->setColumnHidden(3,!show_index->isChecked());
}

void CLibraryWidget::dropIndex()
{
    QList<QTreeWidgetItem*> di=ui->treeLibrary->selectedItems();

    QList<CLibItem*> dli;
    QTreeWidgetItem* i;
    foreach(i,di)
    {
        CLibItem * li((CLibItem*)i);
        if(li->type==CLibItem::Col1)
            dli.append(li);
    }

    if(dli.size()>0)
    {
        QString txt,wh("`library_collection`.`id` in(");
        CLibItem * li;
        foreach(li,dli)
        {
            txt.append(li->text(0)+"\n");
            wh.append(QString::number(li->id)+",");
        }
        wh.replace(QRegExp(",$"),")");

        QMessageBox mb(tr("delete index(es)"),tr("Deleting index(es):\n\n")+txt+tr("\n\nContinue?"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
        if(mb.exec()==QMessageBox::Yes)
        {
            USE_CLEAN_WAIT
            QString query1("delete from `library_index`,`library_iword` using `library_collection` right join `library_book` on `library_collection`.`id`=`library_book`.`collection` right join `library_index` on `library_book`.`id`=`library_index`.`book` left join `library_iword` on `library_index`.`key`=`library_iword`.`i_key` where "+wh);

            MQUERY(le,QString("set @libexists=true"))
            MQUERY(q1,query1)


            messages->MsgInf(tr("index(es) deleted"));
            messages->MsgOk();
            checkIndex();
            emit indexChanged(CLibSearchBase::MySql);
        }
    }
    else
        messages->MsgWarn(tr("no collection selected"));
}

void CLibraryWidget::createIndexes()
{
    QList<QTreeWidgetItem*> di=ui->treeLibrary->selectedItems();

    QList<CLibItem*> dli;
    QTreeWidgetItem* i;
    foreach(i,di)
    {
        CLibItem * li((CLibItem*)i);
        if(li->type==CLibItem::Col1)
            dli.append(li);
    }

    if(dli.size()>0)
    {
        QString txt;
        CLibItem * li;
        foreach(li,dli)
            txt.append(li->text(0)+"\n");

        QMessageBox mb(tr("create index(es)"),tr("Creating index(es):\n\n")+txt+tr("\n\nContinue? (this may take long time)"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
        if(mb.exec()==QMessageBox::Yes)
            foreach(li,dli)
            {
                QString litxt(li->text(0)),
                    /*liitype(li->text(1)),*/
                    lii(li->text(2));

                if(lii!=tr("No"))
                {
                    messages->MsgWarn(tr("Collection '")+litxt+tr("' is indexed already. Skipped."));
                    continue;
                }
                messages->MsgMsg(tr("creating index for '")+litxt+"'");
                if(createIndex(li))
                    messages->MsgMsg(tr("index created"));
                else
                {
                    messages->MsgErr(tr("cannot create index!"));
                    goto label;
                }
            }

            messages->MsgOk();
label:
            checkIndex();
            emit indexChanged(CLibSearchBase::MySql);
        }
        else
            messages->MsgWarn(tr("no collection selected!"));
}

bool CLibraryWidget::createIndex(CLibItem const * const item)
{
    CProgressDialog pd;
    pd.show();

    QString col(QString::number(item->id));
    QString query("select `library`.`book`,`library`.`chapter`,`library`.`verse`,`library`.`text` from `library_collection` join `library_book` on `library_collection`.`id`=`library_book`.`collection` join `library` on `library_book`.`id`=`library`.`book` where `library_collection`.`id`="+col+" order by `library`.`book`,`library`.`chapter`,`library`.`verse`");
    QString query_maxid("select max(`key`) from `library_index`");

    MQUERY_GETFIRST_RF(qmaxid,query_maxid)
    MQUERY_RF(q,query)

    unsigned int id(qmaxid.value(0).toUInt());

    pd.initProgress(tr("creating index ..."),q.size());

    CLibItem const * c=collectionById(item->id);
    CLibItem const * l=c->parent()->parent();

    QString pbook,book,prevlastword;
    while(q.next())
    {
        pbook=book;
        QString strid(QString::number(++id)),
            chapter(q.value(1)),
            verse(q.value(2)),
            text(q.value(3));

        MTextLineItem text_item(text,false);

        pbook=book;
        book=q.value(0);


        QString line(convertLine(text_item.text(),c->format,l->id));

        QString qi1ine("insert into `library_index` (`book`,`chapter`,`verse`,`part_1`,`part_2`,`key`) values ("+book+","+chapter+","+verse+",'"+line+"','',"+strid+")");
        MQUERY_RF_NOMSG(qil,qi1ine)

        QStringList wrds(line.split(' ',QString::SkipEmptyParts));
        if(!wrds.isEmpty())
        {
            QString w,wcmd("insert into `library_iword` (`word`,`i_key`) values ");
            foreach(w,wrds)
                wcmd.append("('"+w+"',"+strid+"),");

            wcmd.remove(QRegExp(",$"));
            MQUERY_RF_NOMSG(qw,wcmd)

            if(item->lang_id==7)
            {
                QString w,wcmd("insert into `library_iword` (`word`,`i_key`) values ");
                bool used=false;
                foreach(w,wrds)
                {
                    if(w.indexOf("j")>-1)
                    {
                        used=true;
                        w.replace("j","i");
                        wcmd.append("('"+w+"',"+strid+"),");
                    }
                }

                if(used)
                {
                    wcmd.remove(QRegExp(",$"));
                    MQUERY_RF_NOMSG(qw,wcmd)
                }
            }
        }
        if(item->index_type==2)
        {

            if(!wrds.isEmpty())
            {
                if(!prevlastword.isEmpty())
                {
                MQUERY_RF_NOMSG(quw,"insert into `library_iword` (`word`,`i_key`) values ('"+prevlastword+wrds.first()+"',"+strid+"-1)")
                }
                prevlastword=wrds.last();
            }
            else
                prevlastword.clear();

            if(pbook==book)
            {
                QString qupdprev("update `library_index` set `part_2`='"+line+"' where `key`=("+strid+"-1)");
                MQUERY_RF_NOMSG(qupr,qupdprev)
            }
        }

        if(text_item.hasNote())
        {
            QStringList wrds_note(text_item.note().split(' ',QString::SkipEmptyParts));
            if(!wrds_note.isEmpty())
            {
                QString w,wcmd("insert into `library_iword` (`word`,`i_key`) values ");
                int uw(0);
                foreach(w,wrds_note)
                    if(CTranslit::isCoptic(w))
                    {
                        uw++;
                        wcmd.append("('"+CTranslit::tr(w,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveAll)+"',"+strid+"),");
                    }

                if(uw>0)
                {
                    wcmd.remove(QRegExp(",$"));
                    MQUERY_RF_NOMSG(qw,wcmd)
                }
            }
        }

        if(text_item.hasIndexW())
        {
            QString w,wcmd("insert into `library_iword` (`word`,`i_key`) values ");
            QStringList il(text_item.indexW().split(";",QString::SkipEmptyParts));
            int uw(0);
            foreach(w,il)
            {
                uw++;
                wcmd.append("('"+w+"',"+strid+"),");
            }
            if(uw>0)
            {
                wcmd.remove(QRegExp(",$"));
                MQUERY_RF_NOMSG(qw,wcmd)
            }
        }

        if(pd.stopped())
        {
            pd.close();
            messages->MsgInf(tr("progress interrupted"));
            return false;
        }
        pd.incProgress();
    }


    return true;
}

bool CLibraryWidget::isSearchable(int id) const
{
    QTreeWidgetItem * i;
    foreach(i,coll1_items)
    {
        CLibItem * li((CLibItem*)i);
        if(id==li->id)
            return li->text(3)==tr("Yes");
    }
    return false;
}

CLibItem const * CLibraryWidget::collectionById(unsigned int id) const
{
    QTreeWidgetItem * i;
    foreach(i,coll1_items)
    {
        CLibItem const* li((CLibItem const*)i);
        if(id==(unsigned int)li->id)
            return li;
    }
    return 0;
}

bool CLibraryWidget::isSearchableByRegexp(int id) const
{
    QTreeWidgetItem * i;
    foreach(i,coll1_items)
    {
        CLibItem * li((CLibItem*)i);
        if(id==li->id)
            return !li->format==0;
    }
    return false;
}

QString CLibraryWidget::convertLine(QString const & line,unsigned short format,unsigned short script) const
{
    QString ns;

    switch(format)
    {
        case 1 : //Native
        {
            switch((CTranslit::Script)script)
            {
                case CTranslit::Copt :
                ns=CTranslit::tr(line,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone);
                break;
                case CTranslit::Latin :
                ns=CTranslit::tr(line,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveNone);
                break;
                case CTranslit::Hebrew :
                ns=CTranslit::tr(line,CTranslit::HebrewNToHebrewTr,true,CTranslit::RemoveNone);
                break;
                case CTranslit::Greek :
                ns=CTranslit::tr(line,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveNone);
                break;
            }
            break;
        }
        case 2 : //Beta
        {
            ns=CTranslit::betaToLatStripped(line,(CTranslit::Script)script);
            break;
        }
        case 3 : //LatTr
        {
            ns=line;
            ns.remove(QRegExp("[^a-zA-Z\\ ]"));
            break;
        }
    }

    while(ns.indexOf("  ")!=-1)
        ns.replace("  "," ");

    return ns.trimmed();
}

void CLibraryWidget::dropAll()
{
    QMessageBox mb(tr("drop all indexes"),tr("Deleting all indexes. Continue?"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
    if(mb.exec()==QMessageBox::Yes)
    {
        USE_CLEAN_WAIT
        MQUERY(q,QString("call clear_indexes()"))

        messages->MsgInf(tr("indexes deleted"));
        messages->MsgOk();
        checkIndex(true);
        emit indexChanged(CLibSearchBase::MySql);
    }
}

void CLibraryWidget::dropEntireLibrary()
{
    QMessageBox mb(tr("drop mysql library"),tr("Deleting all books and indexes. Continue?"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
    if(mb.exec()==QMessageBox::Yes)
    {
        USE_CLEAN_WAIT
        MQUERY(q,QString("call drop_library()"))

        messages->MsgInf(tr("library deleted"));
        messages->MsgOk();
        reloadTree();
        emit indexChanged(CLibSearchBase::MySql);
    }
}

bool CLibraryWidget::loadHtmlLibraryToWidget(MProgressIcon * p_icon)
{
    ui->treeFiles->clear();
    f_files.clear();
    return loadHtmlLibrary(messages,ui->treeHtmlLib,false,p_icon);
}

bool CLibraryWidget::loadHtmlLibrary(CMessages * messages,QTreeWidget * tree,bool chkb_ind,MProgressIcon * p_icon)
{
    USE_CLEAN_WAIT

    messages->MsgMsg(tr("reading html library ..."));

    if(!QFileInfo("library").exists())
    {
        messages->MsgWarn(tr("'library' directory does not exist!"));
        return false;
    }

    if(p_icon)
    {
        int const fcount(MDirLister::countFilesInDir("library"));
        m_msg()->MsgMsg(tr("files detected: ")+QString::number(fcount));

        p_icon->setMaximumPart(fcount);
        p_icon->setValuePart(0);
    }

    QTreeWidgetItem * i (tree->currentItem());

    bool cur_item(false);
    if(i&&diritem.isEmpty())
    {
        //messages->MsgMsg(i->text(2));
        setHtmlItem(i->text(3));
        cur_item=true;
    }

    tree->clear();

    int  const rfcount=readDirs(tree,QDir::toNativeSeparators("library"),0,chkb_ind,p_icon);
    m_msg()->MsgMsg(tr("files retrieved: ")+QString::number(rfcount));
    messages->MsgOk();

    if(cur_item)
        selectHtmlItem(tree,false);

    return true;
}

void CLibraryWidget::on_treeHtmlLib_drag()
{
    drag_items=ui->treeHtmlLib->selectedItems();
}

void CLibraryWidget::on_treeHtmlLib_drop(QTreeWidgetItem * item)
{
    QAction * a=popupDrag.exec(QCursor::pos());
    if(a)
    {
        if(a==a_dd_copy)
            copyHtml(&drag_items);
        else if(a==a_dd_cut)
            cutHtml(&drag_items);

        pasteHtml(item);
    }
}

void CLibraryWidget::validateHtmlItem(MFileInfoItem const * fip,MLibTreeWidgetItem * i,bool chkb_ind)
{
    QString afp(fip->absoluteFilePath()),
        dnam(fip->fileName());

    i->_raw_name=fip->_raw_name;
    i->setText(0,dnam);
    i->setToolTip(0,afp);
    if((i->_exist=fip->exists()))
    {
        qint64 fs(fip->size());
        i->setText(1,CTranslit::humRead(fs));
        i->setToolTip(1,QString::number(fs)+" B");
    }
    else
    {
        i->setText(1,"N/A");
        i->setToolTip(1,"N/A");
    }

    if(QFileInfo(afp)==QFileInfo(diritem))
        dir_t_item=i;

    i->setText(3,afp);
    QPixmap ic_pix;
    if((i->_is_dir=fip->isDir()))
    {
        //i->setIcon(0,QIcon(":/new/icons/icons/folder.png"));
        ic_pix=QPixmap(":/new/icons/icons/folder.png");
        if(QFileInfo(afp+QDir::separator()+"index.swish-e").exists())
        {
            i->setText(2,tr("yes"));
            i->setIcon(2,QIcon(":/new/icons/icons/greencheck.png"));
            if(chkb_ind)
            {
                i->setFlags(Qt::ItemIsUserCheckable|Qt::ItemIsEnabled);
                i->setCheckState(0,Qt::Unchecked);
            }
        }
        else
        {
            i->setText(2,tr("no"));
            i->setIcon(2,QIcon(":/new/icons/icons/uncheck.png"));
            if(chkb_ind)
            {
                QFont f(i->font(0));
                f.setStrikeOut(true);
                i->setFont(0,f);
                //i->setCheckState(0,Qt::Unchecked);
            }
        }
    }
    else if(afp.endsWith(".htm",Qt::CaseInsensitive)||afp.endsWith(".html",Qt::CaseInsensitive))
        //i->setIcon(0,QIcon(":/new/icons/icons/html_file.png"));
        ic_pix=QPixmap(":/new/icons/icons/html_file.png");
    else if(afp.endsWith(".djvu",Qt::CaseInsensitive))
        //i->setIcon(0,QIcon(":/new/icons/icons/djvu_icon.png"));
        ic_pix=QPixmap(":/new/icons/icons/djvu_icon.png");
    else if(afp.endsWith(".pdf",Qt::CaseInsensitive))
        //i->setIcon(0,QIcon(":/new/icons/icons/pdf_icon.png"));
        ic_pix=QPixmap(":/new/icons/icons/pdf_icon.png");
    else if(afp.indexOf(m_sett()->imageFormatsRegExp())!=-1)
        //i->setIcon(0,QIcon(":/new/icons/icons/image.png"));
        ic_pix=QPixmap(":/new/icons/icons/image.png");
    else
        //i->setIcon(0,QIcon(":/new/icons/icons/txt_file.png"));

        ic_pix=QPixmap(":/new/icons/icons/txt_file.png");

    if(i->_exist)
    {
        if((i->_is_symlink=fip->isSymLink()))
        {
            QFont f(i->font(0));
            QString sl_val(tr("valid"));
            if(!QFile(fip->symLinkTarget()).exists())
            {
                sl_val=QString(tr("INVALID"));
                f.setStrikeOut(true);
            }
            else
                f.setStrikeOut(false);
            f.setItalic(true);
            i->setFont(0,f);
            i->setToolTip(0,QString(i->toolTip(0)+"\n( "+sl_val+tr(" symbolic link, target: ")+MFSClip::linkTarget(*fip)+tr("\nabsolute path: ")+fip->symLinkTarget()+" )"));
            QPixmap slp(":/new/icons/icons/link.png");
            QPainter painter(&ic_pix);
            painter.drawPixmap(QRect(QPoint(0,0),ic_pix.size()),slp);
        }
    }
    else
    {
        QFont f(i->font(0));
        f.setStrikeOut(true);

        i->setFont(0,f);
        i->setToolTip(0,QString(i->toolTip(0)+tr("\nfile does not exist!")));
        ic_pix=QPixmap(":/new/icons/icons/exclam.png");
    }

    i->setIcon(0,QIcon(ic_pix));
}

int CLibraryWidget::readDirs(QTreeWidget * tree,QDir const & dir,QTreeWidgetItem * parentItem, bool chkb_ind,MProgressIcon * p_icon)
{
    MDirLister dl;
    dl.makeList(dir.absolutePath());
    MFileInfoItemListPtr & fl(dl.items_sorted());
    int rfcount(fl.count());
    //QFileInfoList fl=dir.entryInfoList(QDir::Dirs|QDir::Files|QDir::NoDotAndDotDot,QDir::Name|QDir::DirsFirst);
    for(int x=0;x<fl.count();x++)
    {
        MFileInfoItem const * fip(fl.at(x));
        if(!_hidden_files&&fip->isHidden())
            continue;

        MLibTreeWidgetItem * i=new MLibTreeWidgetItem();

        validateHtmlItem(fip,i,chkb_ind);

        if(parentItem)
            parentItem->addChild(i);
        else
            tree->addTopLevelItem(i);

        if(p_icon)
        {
            p_icon->incValuePart();
            //QApplication::processEvents();
        }

        if(i->_is_dir)
            rfcount+=readDirs(tree,QDir(fip->absoluteFilePath()),i,chkb_ind,p_icon);
    }

    return rfcount;
}

void CLibraryWidget::on_treeHtmlLib_itemDoubleClicked(QTreeWidgetItem* item, int )
{
    if(item)
    {
        QFileInfo name(item->text(3));
        if(!name.isDir())
            openHtmlBook(messages,name.absoluteFilePath(),Auto);
    }
}

QWidget * CLibraryWidget::openHtmlBook(CMessages * messages,QString const & filename,DocFmt docfmt,QString const & show_text,QString const & wtitle,QIcon const & w_icon)
{
    USE_CLEAN_WAIT

    messages->MsgMsg(tr("opening html book '")+filename+"' ...");
    if(!QFile::exists(filename))
    {
        m_msg()->MsgErr(tr("File '")+filename+tr("' does not exist!"));
        return 0;
    }

    QWidget * w(0);

    switch(docfmt)
    {
    case Auto :
        {
            if(filename.endsWith(".ilt.html",Qt::CaseInsensitive))
            {
                w=new CTranslBook(
                        filename,CBookTextBrowser::Latin,show_text);
                w->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
            }
            else if(filename.endsWith(".htm",Qt::CaseInsensitive)||filename.endsWith(".html",Qt::CaseInsensitive))
            {
                w=new CHtmlReader(QFileInfo(filename).fileName(),filename,CBookTextBrowser::Latin,show_text);
                w->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
            }
            else if(filename.endsWith(".djvu",Qt::CaseInsensitive))
                w=new MDjvuReader2(filename);
#ifndef NO_POPPLER
            else if(filename.endsWith(".pdf",Qt::CaseInsensitive))
                w=new MPdfReader2(filename,show_text);
#endif
            else if(filename.indexOf(m_sett()->imageFormatsRegExp())!=-1)
                w=new MImageBookReader(filename);
            else
            {
                w=new CBookReader(messages, filename, CBookReader::Txt, CBookTextBrowser::Latin, show_text);
                w->setWindowIcon(QIcon(":/new/icons/icons/txt_file.png"));
            }
            break;
        }
    case Txt :
        w=new CBookReader(
                messages,filename,CBookReader::Txt,CBookTextBrowser::Latin,show_text);
        w->setWindowIcon(QIcon(":/new/icons/icons/txt_file.png"));
        break;
    case Html :
        w=new CHtmlReader(QFileInfo(filename).fileName(),filename,CBookTextBrowser::Latin,show_text);
        w->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
        break;
    case Djvu :
        w=new MDjvuReader2(filename);
        break;
    case Pdf :
#ifndef NO_POPPLER
        w=new MPdfReader2(filename,show_text);
#endif
        break;
    case IltHtml :
        w=new CTranslBook(
                filename,CBookTextBrowser::Latin,show_text);
        w->setWindowIcon(QIcon(":/new/icons/icons/html_file.png"));
        break;
    case Image :
        w=new MImageBookReader(filename);
        break;
    }

    if(w)
    {
        QString fn(QFileInfo(filename).fileName());
        if(wtitle.isEmpty())
            w->setWindowTitle(fn);
        else
            w->setWindowTitle(wtitle);
        //QMdiSubWindow *mdiw= messages->settings().mdiArea()->addSubWindow(w);
        /*if(w_icon.isNull())
            mdiw->setWindowIcon(w->windowIcon());
        else
            mdiw->setWindowIcon(w_icon);*/
        if(!w_icon.isNull())
            w->setWindowIcon(w_icon);
        w->show();
        messages->MsgMsg(tr("book opened: ")+fn,true);
        //messages->settings().mdiArea()->activeSubWindow(mdiw);
        messages->MsgOk();

        m_sett()->wnds()->addNewWindow(w);
        CSettings::recentFiles.prependFileItem(MFileItem(filename));
    }

    return w;
}

QString CLibraryWidget::collectNames(QList<QTreeWidgetItem*> * items,QString const & target)
{
    QString msgs;
    for(int x=0;x<items->count();x++)
        msgs.append(items->at(x)->text(3)+"\n");
    if(!target.isEmpty())
        msgs.append("\n"+tr("TO ")+target+"\n\n");

    return msgs;
}

void CLibraryWidget::on_treeHtmlLib_customContextMenuRequested(QPoint )
{
    QList<QTreeWidgetItem*> li=ui->treeHtmlLib->selectedItems();
    QTreeWidgetItem * ci(ui->treeHtmlLib->currentItem());
    bool const sel(li.count()>0);
    open_book_h->setEnabled(sel);
    popupOpenAs.setEnabled(sel);
    a_cutfd->setEnabled(sel);
    a_copyfd->setEnabled(sel);
    a_pastefd->setEnabled(ci&&_clipboard.count()>0);
    a_printfd->setEnabled(_clipboard.count()>0);
    find_file->setChecked(ui->wdgFind->isVisible());
    rm_dir_h->setEnabled(sel);
    rename_h->setEnabled(ci);
    //popupEncoding.setEnabled(ci);

    QAction * a;
    popupHtml.setActiveAction(open_book_h);
    if((a=popupHtml.exec()))
    {
        if(a==reload_tree_h)
            loadHtmlLibraryToWidget();
        else if(a==a_show_hidden)
        {
            _hidden_files=a_show_hidden->isChecked();
            loadHtmlLibraryToWidget();
        }
        else if(a==open_book_h)
            openHtmlBooks();
        else if(a==a_ashtml)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),Html);
        }
        else if(a==a_astxt)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),Txt);
        }
        else if(a==a_asdjvu)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),Djvu);
        }
        else if(a==a_aspdf)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),Pdf);
        }
        else if(a==a_astr)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),IltHtml);
        }
        else if(a==a_edittxt)
        {
            if(ci)
            {
                MNotepad * notepad=new MNotepad();
                if(notepad)
                {
                    notepad->loadFile(ci->text(3));
                    notepad->show();
                }
            }
        }
        else if(a==expand_h)
            ui->treeHtmlLib->expand(ui->treeHtmlLib->currentIndex());
        else if(a==collapse_h)
            ui->treeHtmlLib->collapse(ui->treeHtmlLib->currentIndex());
        else if(a==expand_all_h)
            ui->treeHtmlLib->expandAll();
        else if(a==collapse_all_h)
            ui->treeHtmlLib->collapseAll();
        else if(a==show_index_h)
            ui->treeHtmlLib->setColumnHidden(2,!show_index_h->isChecked());
        else if(a==cr_index_h)
            createHtmlIndex();
        else if(a==drop_index_h)
            dropHtmlIndex();
        else if(a==rm_dir_h)
            delHtmlDir(&li);
        else if(a==downloadweb_h)
            downloadWeb();
        else if(a==create_dir_h)
            mkDir();
        else if(a==rename_h)
            renameDF(ci);
        else if(a==a_asimg)
        {
            if(ci)
                openHtmlBook(messages,ci->text(3),Image);
        }
        else if(a==find_file)
            findFileDialogSwitch();
        else if(a==a_cutfd)
            cutHtml(&li);
        else if(a==a_copyfd)
            copyHtml(&li);
        else if(a==a_pastefd)
            pasteHtml(ci);
        else if(a==a_printfd)
            _clipboard.printClipboard();
    }
}

void CLibraryWidget::findFileDialogSwitch()
{
    bool const v(ui->wdgFind->isVisible());
    ui->wdgFind->setVisible(!v);
    ui->wdgFindFileButton->setVisible(v);
}

void CLibraryWidget::openHtmlBooks()
{
    QList<QTreeWidgetItem*> di=ui->treeHtmlLib->selectedItems();
    if(di.count()>1)
    {
        QMessageBox mb(QMessageBox::Question,tr("open books"),tr("Open ")+QString::number(di.count())+tr(" books?"),QMessageBox::Open|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Cancel)
            return;
    }

    QTreeWidgetItem * i;
    foreach(i,di)
        on_treeHtmlLib_itemDoubleClicked(i,0);
}

void CLibraryWidget::cutHtml(QList<QTreeWidgetItem*> * items)
{
    _clipboard.clear();
    for(int x=0;x<items->count();x++)
        _clipboard.cut(QFileInfo(items->at(x)->text(3)));
    m_msg()->MsgMsg(QString::number(_clipboard.count())+tr(" items copied into clipboard"));
}

void CLibraryWidget::copyHtml(QList<QTreeWidgetItem*> * items)
{
    _clipboard.clear();
    for(int x=0;x<items->count();x++)
        _clipboard.copy(QFileInfo(items->at(x)->text(3)));
    m_msg()->MsgMsg(QString::number(_clipboard.count())+tr(" items copied into clipboard"));
}

void CLibraryWidget::pasteHtml(QTreeWidgetItem * item)
{
    QFileInfo fi;
    if(item)
        fi=QFileInfo(item->text(3));
    else
        fi=QFileInfo("library");

    if(fi.isDir())
    {
        QDir d(fi.absoluteFilePath());
        if(_clipboard.paste(d))
            findHtmlItem(d);
    }
    else
        m_msg()->MsgErr("item '"+fi.absoluteFilePath()+tr("' is not a directory!"));
}

void CLibraryWidget::createHtmlIndex()
{
    if(ui->treeHtmlLib->selectedItems().count()>0)
    {
        QFileInfo dir(ui->treeHtmlLib->selectedItems().first()->text(3));
        if(dir.isDir())
        {
            MIndexDir2 * d=new MIndexDir2(messages,dir.absoluteFilePath(),*this);

            d->show();
            //findHtmlItem(d.targetDir());
        }
        else
            m_msg()->MsgErr(tr("you can index a directory only!"));
    }
    else
        m_msg()->MsgErr(tr("no selected item!"));


    /*QList<QTreeWidgetItem*> li(treeHtmlLib->selectedItems()),ldirs;

    if(li.count()>0)
    {
        QString msgs;
        for(int x=0;x<li.count();x++)
        {
            if(!li[x]->text(1).isEmpty())
            {
                ldirs.append(li);
                msgs.append(li[x]->text(2)+"\n");
            }
        }
        if(ldirs.count()>0)
        {
            CHtmlIndexDialog id(msgs,(QWidget*)this);
            if(id.exec()==QDialog::Accepted)
            {
                USE_CLEAN_WAIT
                for(int y=0;y<ldirs.count();y++)
                    createHtmlIndex(ldirs[y]->text(2),id.commandsOnly());



                loadHtmlLibrary(messages,htmlTree(),false);
                emit indexChanged(true);

            }
        }
        else
            QMessageBox(QMessageBox::Information,"create html index","no director(y|ies) selected",QMessageBox::Close).exec();
    }
    else
        QMessageBox(QMessageBox::Information,"create html index","no item(s) selected",QMessageBox::Close).exec();*/
}

/*void CLibraryWidget::createHtmlIndex(QString const & directory,bool commands_only)
{
    QString cmd(messages->settings().swishCmd()+" -c data/swish-e/swishconf_index -S fs -i "+directory+" -f "+directory+"/index.swish-e");
    messages->MsgMsg("executing command '"+cmd+"'");
    if(!commands_only)
    {
        QProcess p;
        p.start(cmd);
        p.waitForFinished(-1);

        if(p.exitCode()==0)
        {
            messages->MsgMsg(p.readAll());
            messages->MsgOk();
        }
        else
        {
            messages->MsgErr("command: "+cmd+" - exit code: "+QString::number(p.exitCode())+"\n"+p.readAll());
        }
    }
}*/

void CLibraryWidget::dropHtmlIndex()
{
    QList<QTreeWidgetItem*> li(ui->treeHtmlLib->selectedItems()),sl;

    if(li.count()>0)
    {
        QString msgs;
        for(int y=0;y<li.count();y++)
        {
            sl.append(li[y]);
            msgs.append(li[y]->text(3)+"\n");
        }

        if(QMessageBox(QMessageBox::Information,tr("drop html index"),tr("Deleting indexes:\n\n")+msgs+tr("\n\nContinue?"),QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            for(int x=0;x<sl.count();x++)
            {
                QString dirname(sl[x]->text(3));
                if(QFileInfo(dirname).isDir())
                {
                    QFile f(dirname+"/index.swish-e"),
                        f2(dirname+"/index.swish-e.prop");
                    if(f.exists())
                    {
                        if(f.remove())
                        {
                            messages->MsgMsg("'"+f.fileName()+"' removed");
                        }
                        else
                        {
                            messages->MsgErr(tr("cannot remove '")+f.fileName()+"'");
                        }
                    }
                    else
                        messages->MsgErr(tr("file '")+f.fileName()+tr("' does not exist"));

                    if(f2.exists())
                    {
                        if(f2.remove())
                        {
                            messages->MsgMsg("'"+f2.fileName()+tr("' removed"));
                        }
                        else
                        {
                            messages->MsgErr(tr("cannot remove '")+f2.fileName()+"'");
                        }
                    }
                    else
                        messages->MsgErr(tr("file '")+f2.fileName()+tr("' does not exist"));
                }
                else
                    messages->MsgErr("'"+dirname+tr(" is not a directory"));
            }
            loadHtmlLibraryToWidget();
            emit indexChanged(CLibSearchBase::Html);
        }
    }
    else
        QMessageBox(QMessageBox::Information,tr("drop html index"),tr("no items selected"),QMessageBox::Close).exec();
}

void CLibraryWidget::delHtmlDir(QList<QTreeWidgetItem*> * items)
{
    if(items->count()>0)
    {
        QFileInfo fi(items->at(0)->text(3));
        QDir cdir(fi.absoluteDir());
        setHtmlItem(cdir.absolutePath());
    }
    _clipboard.clear();
    for(int x=0;x<items->count();x++)
        _clipboard.remove(QFileInfo(items->at(x)->text(3)));
    m_msg()->MsgMsg(QString::number(_clipboard.count())+tr(" items copied into clipboard"));

    if(_clipboard.paste(QDir()))
    {
        loadHtmlLibraryToWidget();
        selectHtmlItem(ui->treeHtmlLib,true);
    }

    /*QList<QTreeWidgetItem*> li(ui->treeHtmlLib->selectedItems()),sl;

    if(li.count()>0)
    {
        QString msgs;
        for(int y=0;y<li.count();y++)
        {
            sl.append(li[y]);
            msgs.append(li[y]->text(2)+"\n");
        }

        if(QMessageBox(QMessageBox::Information,tr("delete directory/file"),tr("Deleting directories/files:\n\n")+msgs+tr("\n\nContinue?"),QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            op_OK=true;
            QString dirname;
            for(int x=0;x<sl.count();x++)
            {
                dirname=sl[x]->text(2);
                if(QFileInfo(dirname).isDir())
                {
                    rmDir(QDir(dirname));
                }
                else
                {
                    if(QFile::remove(dirname))
                    {
                        messages->MsgMsg(tr("file '")+dirname+tr("' removed"));
                    }
                    else
                    {
                        messages->MsgMsg(tr("cannor remove file '")+dirname+"'");
                        op_OK=false;
                    }
                }
            }

            if(!op_OK)
                messages->MsgErr(tr("one or more files/directories cannot be deleted"));

            setHtmlItem(dirname);
            cdupHtmlItem();

            loadHtmlLibraryToWidget();
            selectHtmlItem(ui->treeHtmlLib,true);

            emit indexChanged(CLibSearchBase::Html);
        }
    }
    else
        QMessageBox(QMessageBox::Information,tr("drop html index"),tr("no items selected"),QMessageBox::Close).exec();*/
}

/*void CLibraryWidget::rmDir(QDir const & dir)
{
    if(dir.count()>0)
    {
        QFileInfoList fl(dir.entryInfoList(QDir::AllEntries|QDir::Hidden|QDir::System|QDir::NoDotAndDotDot));
        for(int x=0;x<fl.count();x++)
        {
            QFileInfo fi(fl[x]);

            if(fi.isDir())
                rmDir(QDir(fi.absoluteFilePath()));
            else
            {
                if(!QFile::remove(fi.absoluteFilePath()))
                {
                    messages->MsgMsg(tr("cannot remove file '")+fi.absoluteFilePath()+"'");
                    op_OK=false;
                }
                else
                    messages->MsgMsg(tr("file '")+fi.absoluteFilePath()+tr("' removed"));
            }
        }
        if(!QDir().rmdir(dir.absolutePath()))
        {
            messages->MsgMsg(tr("cannot remove directory '")+dir.absolutePath()+"'");
            op_OK=false;
        }
        else
            messages->MsgMsg(tr("directory '")+dir.absolutePath()+tr("' removed"));
    }
}*/

void CLibraryWidget::downloadWeb()
{
    if(ui->treeHtmlLib->selectedItems().count()>0)
    {
        QFileInfo dir(ui->treeHtmlLib->selectedItems().first()->text(3));
        if(dir.isDir())
        {
            MDownloadWeb * d=new MDownloadWeb(messages,dir.absoluteFilePath(),*this);

            d->show();
            //findHtmlItem(d.targetDir());
        }
        else
            m_msg()->MsgErr(tr("you can download into a directory only!"));
    }
    else
        m_msg()->MsgErr(tr("no item selected!"));
}

void CLibraryWidget::renameDF(QTreeWidgetItem * item)
{
    if(item)
    {
        QFileInfo oldfile(item->text(3));
        QString const oldfpath(oldfile.path()+"/"),
                oldfname(oldfile.fileName());
        MRenameDialog d(oldfname,oldfpath);
        if(d.exec()==QDialog::Accepted)
        {
            QString const oldname(oldfile.absoluteFilePath()),
                    newname(oldfpath+d.newName());
            m_msg()->MsgMsg(tr("renaming file '")+oldname+tr("' to '")+newname+"' ...");
            if(QFile::rename(oldname,newname))
            {
                m_msg()->MsgOk();
                setHtmlItem(newname);
                loadHtmlLibraryToWidget();
                selectHtmlItem(ui->treeHtmlLib,false);
            }
            else
                m_msg()->MsgErr(tr("failed!"));
        }
    }
}

void CLibraryWidget::mkDir()
{
    QFileDialog d(this,"mkdir");
    d.setAcceptMode(QFileDialog::AcceptSave);
    d.setFileMode(QFileDialog::AnyFile);
    d.setOption(QFileDialog::ShowDirsOnly,true);

    if(ui->treeHtmlLib->selectedItems().count()>0)
    {
        QFileInfo dir(ui->treeHtmlLib->selectedItems().first()->text(3));
        if(dir.isDir())
            d.setDirectory(dir.absoluteFilePath());
        else
            d.setDirectory(dir.absolutePath());
    }
    else
        d.setDirectory("library");

    if(d.exec()==QDialog::Accepted)
    {
        QDir dir(d.directory());
        QString newdir(QFileInfo(d.selectedFiles().first()).fileName());

        if(!dir.mkdir(newdir))
        {
            messages->MsgErr(tr("cannot create directory '")+newdir+tr(" in '")+dir.absolutePath()+"'");
        }
        else
        {
            messages->MsgMsg(tr("directory '")+newdir+tr("' created in ")+dir.absolutePath()+"'");

            setHtmlItem(dir.absolutePath()+QDir::separator()+newdir);
            loadHtmlLibraryToWidget();
            selectHtmlItem(ui->treeHtmlLib,false);
        }
    }
}

/*void CLibraryWidget::copyBookId() const
{
    if(treeLibrary->selectedItems().count()>0)
    {
        CLibItem * li=(CLibItem *)treeLibrary->selectedItems().first();
        QApplication::clipboard()->setText(QString::number(li->id));
    }
}*/

void CLibraryWidget::setHtmlItem(QString const & dirname)
{
    diritem=QFileInfo(dirname).absoluteFilePath();
}

bool CLibraryWidget::cdupHtmlItem()
{
    QFileInfo fi(diritem);
    if(fi.isDir())
    {
        QDir d(diritem);
        if(d.cdUp())
        {
            diritem=d.absolutePath();
            return true;
        }
    }
    return false;
}

/*void CLibraryWidget::setHtmlItem(QTreeWidgetItem * item)
{
    dir_t_item=item;
}*/

void CLibraryWidget::clearHtmlItem()
{
    diritem.clear();
    dir_t_item=0;
}

void CLibraryWidget::selectHtmlItem(QTreeWidget * tree,bool expand)
{
    if(dir_t_item)
    {
        //messages->MsgMsg("matched");
        tree->clearSelection();
        dir_t_item->setSelected(true);
        tree->setCurrentItem(dir_t_item);
        if(expand)
            tree->expandItem(dir_t_item);

        clearHtmlItem();
    }
}

void CLibraryWidget::createNewCol(CLibItem const * item)
{
    if(item)
    {
        CLibItem * i2=(CLibItem *)item->parent();
        if(i2)
        {
            //QString query1("select max(`id`)+1 from `library_collection`");


            messages->MsgMsg("creating new collection ...");
            //MQUERY_GETFIRST(q1,query1)

            /*newCid=q1.value(0).toInt();
            if(newCid<1000)
                newCid=1000;*/

            QString query("insert into `library_collection` (`name`,`script`,`lang`,`format`) values ('new collection',"+QString::number(i2->id)+","+QString::number(item->id)+",1)");
            MQUERY(q,query)

            messages->MsgInf(tr("collection created"));
            messages->MsgOk();
            reloadTree();
        }
    }
}

void CLibraryWidget::createNewBook(CLibItem const * item)
{
    if(item)
    {
        //CLibItem * i2=(CLibItem *)item->parent();
        //QString query1("select max(`id`)+1 from `library_book`");


        messages->MsgMsg(tr("creating new book ..."));
        //MQUERY_GETFIRST(q1,query1)

        /*newBid=q1.value(0).toInt();
        if(newBid<10000)
            newBid=10000;*/
        //QString nb(QString::number(newBid));
        QString query("insert into `library_book` (`collection`,`name`,`ord`) values ("+QString::number(item->id)+",'new book',0)");
                //query3("select last_insert_id()");
        MQUERY(q,query)
        /*MQUERY_GETFIRST(q3,query3)*/

        QString query2("insert into `library` (`book`,`chapter`,`verse`,`text`) values (last_insert_id(),1,1,'initial verse')");
        MQUERY(q2,query2)

        messages->MsgInf(tr("book created"));
        messages->MsgOk();
        reloadTree();
    }
}

void CLibraryWidget::editBook(CLibItem const * item)
{
    if(item)
    {
        CLibItem * i2=(CLibItem *)item->parent();
        if(i2)
        {
            CLibItem * lai=(CLibItem *)i2->parent();
            if(lai)
            {
                CLibItem * sci=(CLibItem *)lai->parent();
                if(sci)
                {
                    MBookEdit * be=new MBookEdit(i2->id,i2->text(0),sci->id,lai->id,i2->format,i2->index_type,item->id,item->text(0),lai->text(0),messages);

                    be->setWindowTitle(QString(item->text(0)+" | edit"));
                    //messages->settings().mdiArea()->addSubWindow(be)->setWindowIcon(QIcon(":/new/icons/icons/file_icon.png"));
                    be->show();
                }
            }
        }
    }
}

void CLibraryWidget::removeBook(CLibItem const * item)
{
    if(item)
    {
        if(QMessageBox(QMessageBox::Question,tr("library"),tr("Deleting book ")+item->text(0)+tr(" ...\nContinue?"),QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            QString query("delete from `library_book`,`library`,`library_index`,`library_iword` using `library_book` left join `library` on `library_book`.`id`=`library`.`book` left join `library_index` on `library`.`i_key`=`library_index`.`key` left join `library_iword` on `library_index`.`key`=`library_iword`.`i_key` where `library_book`.`id`="+QString::number(item->id));
            MQUERY(q,query)

            messages->MsgInf(tr("book deleted"));
            messages->MsgOk();
            reloadTree();
        }
    }
}

void CLibraryWidget::removeLang(CLibItem const * item)
{
    if(item)
    {
        /*QList<QTreeWidgetItem*> di=treeLibrary->selectedItems();

        QList<CLibItem*> dli;
        QTreeWidgetItem* i;
        foreach(i,di)
        {
            CLibItem * li((CLibItem*)i);
            if(li->type==CLibItem::Lang)
                dli.append(li);
        }

        if(dli.size()>0)
        {
            QString txt,wh;
            CLibItem * li;
            foreach(li,dli)
            {
                txt.append(li->text(0)+"\n");
                wh.append("`library_lang`.`id`="+QString::number(li->id)+" or ");
            }
            wh.remove(QRegExp(" or $"));
*/
        if(QMessageBox(QMessageBox::Question,tr("library"),tr("Deleting lang(s):\n\n")+item->text(0)+tr(" ...\nContinue?"),QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            /*if(item->id>=1000)
            {*/
                QString langid(QString::number(item->id));
                QString query1("select count(`lang`) from `library_collection` where `lang`="+langid);
                MQUERY_GETFIRST(q1,query1)
                if(q1.value(0).toInt()==0)
                {
                    QString query("delete from `library_lang` where `id`="+langid);
                    MQUERY(q,query)

                    messages->MsgInf(tr("deleted"));
                    messages->MsgOk();
                    reloadTree();
                }
                else
                    messages->MsgWarn(tr("remove all collections first"));
            /*}
            else
                messages->MsgWarn(tr("this item cannot be deleted"));*/
        }
    }
    //}
}

void CLibraryWidget::createNewLang(CLibItem const * item)
{
    if(item)
    {
        /*QString query1("select max(`id`)+1 from `library_lang`");*/

        messages->MsgMsg(tr("creating new language ..."));
        //MQUERY_GETFIRST(q1,query1)

        /*newLid=q1.value(0).toInt();
        if(newLid<1000)
            newLid=1000;*/
        QString query("insert into `library_lang` (`name`,`script`,`def_coll`) values ('new lang',"+QString::number(item->id)+",'utf8_bin')");
        MQUERY(q,query)

        messages->MsgInf(tr("language created"));
        messages->MsgOk();
        reloadTree();
    }
}

bool CLibraryWidget::findHtmlItem(QDir const & dir)
{
    if(dir.absolutePath().startsWith(QDir("library").absolutePath()))
    {
        setHtmlItem(dir.absolutePath());
        loadHtmlLibraryToWidget();
        selectHtmlItem(ui->treeHtmlLib,true);
        return true;
    }
    return false;
}

void CLibraryWidget::slot_menu()
{
    switch(ui->tabLibrary->currentIndex())
    {
    case 0 :
        popup.setButton(_libtitle.actionButtonPtr());
        on_treeLibrary_customContextMenuRequested(QPoint());
        break;
    case 1 :
        popupHtml.setButton(_libtitle.actionButtonPtr());
        on_treeHtmlLib_customContextMenuRequested(QPoint());
        break;
    case 2 :
        popupTLG.setButton(_libtitle.actionButtonPtr());
        on_treeTLG_customContextMenuRequested(QPoint());
        break;
    }
}

void CLibraryWidget::getSimulBooks(QTreeWidget * tree) const
{
    USE_CLEAN_WAIT

    tree->clear();
    for(int x=0;x<ui->treeLibrary->topLevelItemCount();x++)
    {
        CLibItem * i=(CLibItem *)ui->treeLibrary->topLevelItem(x);
        CSimulTreeItem * si=new CSimulTreeItem(false,i->text(0),0,0,0);
        si->setText(0,si->_title);
        si->setIcon(0,i->icon(0));
        tree->addTopLevelItem(si);
        if(i->childCount()>0)
            cloneSimulChilds(i,si);
    }
}

void CLibraryWidget::cloneSimulChilds(CLibItem * item,CSimulTreeItem * sitem) const
{
    for(int x=0;x<item->childCount();x++)
    {
        CLibItem * i=(CLibItem *)item->child(x);

        CLibItem * topi(item);
        while(topi->parent()!=0)
            topi=(CLibItem *)topi->parent();


        CSimulTreeItem * si=new CSimulTreeItem(i->type==CLibItem::Book1,i->text(0),i->id,item->format,topi->id);
        si->setText(0,si->_title);
        si->setIcon(0,i->icon(0));
        sitem->addChild(si);
        if(i->childCount()>0)
            cloneSimulChilds(i,si);
    }
}

void CLibraryWidget::activate()
{
    parentWidget()->show();
    ui->tabLibrary->setCurrentIndex(1);
    ui->treeHtmlLib->setFocus();
    activateWindow();
}

void CLibraryWidget::openMysqlBook(int key,int ch,int v,int script)
{
    USE_CLEAN_WAIT
    QString query("select `library_collection`.`name`,`library_collection`.`format`,`library_book`.`name` from `library_collection` inner join `library_book` on `library_collection`.`id`=`library_book`.`collection` where `library_book`.`id`="+QString::number(key));

    MQUERY(q,query)

    if(q.size()<1)
    {

        messages->MsgErr(tr("This book is not in library! Import proper collection first."));
        return;
    }
    if(!q.first())
    {
        messages->MsgErr(q.lastError());
        return;
    }
    int format=q.value(1).toInt();
    QString bname(q.value(2)),cname(q.value(0));

    MVersedBook * b= new MVersedBook(bname,(MVersedBook::Script)script,(MVersedBook::TextFormat)format,key);

    if(b)
    {
        QString const fbn(cname+" | "+bname);
        b->setWindowTitle(fbn);
        b->findVerse(ch,v);
        b->show();
        messages->MsgMsg(tr("book opened: ")+fbn,true);

        m_sett()->wnds()->addNewWindow(b);
        CSettings::recentFiles.prependFileItem(MFileItem(fbn,key,0,0,(unsigned int)script));
    }
}

void CLibraryWidget::readTlgAuthors()
{

}

void CLibraryWidget::readTlgWorks()
{

}

void CLibraryWidget::loadTlgCorp()
{
    if(m_sett()->isTlgEnabled())
    {
        ui->treeTLG->clear();
        m_msg()->MsgMsg(tr("reading TLG/PHI database ..."));
        ui->tabLibrary->setTabEnabled(2,true);

        QStringList dirs;
        dirs << m_sett()->dir1()
             << m_sett()->dir2()
             << m_sett()->dir3();


        try {
            for(int y=0;y<dirs.count();y++)
            {
                IbycusAuthTab at(dirs.at(y).toStdString());
                int const xc(at.Count());
                for(int x=0;x<xc;x++)
                {
                    QTreeWidgetItem * ti=new QTreeWidgetItem(0);
                    ti->setText(0,at.Name(x).c_str());
                    ti->setText(1,at.Tag(x).c_str());
                    ti->setText(2,dirs[y]);

                    int const zc(at.Count(x));
                    for(int z=0;z<zc;z++)
                    {
                        QTreeWidgetItem * i=new QTreeWidgetItem(0);
                        QString nm(at.Id(x,z).c_str());
                        i->setText(0,at.Name(x,z).c_str());
                        i->setText(1,nm);
                        try{
                            IbycusIdtFile itxt(nm.toStdString(),dirs.at(y).toStdString());
                            int const qc(itxt.Count());
                            for(int q=0;q<qc;q++)
                            {
                                int const wc(itxt.Count(q));
                                for(int w=0;w<wc;w++)
                                {
                                    QTreeWidgetItem * ia=new QTreeWidgetItem(0);
                                    ia->setText(0,itxt.Name(q,w).c_str());
                                    ia->setText(1,QString::number(q));
                                    ia->setText(2,QString::number(w));
                                    i->addChild(ia);
                                }
                            }
                            //ti->addChild(i);
                        }
                        catch(IbycusException e){m_msg()->MsgMsg(nm+tr(": TLG/PHI library read error: ")+QString(e.what()));}
                        ti->addChild(i);
                    }
                    ui->treeTLG->addTopLevelItem(ti);
                }
            }
        }
        catch(IbycusException e)
        {
            m_msg()->MsgErr(e.what());
            return;
        }
        m_msg()->MsgOk();
    }
    else
        ui->tabLibrary->setTabEnabled(2,false);

    return;
}

void CLibraryWidget::on_treeTLG_customContextMenuRequested(QPoint )
{
    QTreeWidgetItem * i(0),*pi(0),*ppi(0);
    if(ui->treeTLG->selectedItems().count()>0)
        i=ui->treeTLG->selectedItems().first();

    if(i)
    {
        pi=i->parent();
        if(pi)
            ppi=pi->parent();
    }

    tlg_open_book->setEnabled(ppi);

    QAction * a;
    popupTLG.setActiveAction(tlg_open_book);
    if((a=popupTLG.exec()))
    {
        if(a==tlg_open_book)
            openTlgBook(i);
        else if(a==tlg_expand)
            ui->treeTLG->expand(ui->treeTLG->currentIndex());
        else if(a==tlg_collapse)
            ui->treeTLG->collapse(ui->treeTLG->currentIndex());
        else if(a==tlg_expand_all)
            ui->treeTLG->expandAll();
        else if(a==tlg_reload)
            loadTlgCorp();
    }
}

void CLibraryWidget::openTlgBook(QTreeWidgetItem * item)
{

    QTreeWidgetItem * iauth(item->parent());
    if(!iauth)
        return;
    QTreeWidgetItem * icorp(iauth->parent());
    if(!icorp)
        return;


    USE_CLEAN_WAIT

    CBookReader::Format br_f;
    CTranslit::Script scr;
    CBookTextBrowser::Script btscr;

    if(icorp->text(1)=="COP")
    {
        br_f=CBookReader::TlgCoptic;
        scr=CTranslit::Copt;
        btscr=CBookTextBrowser::Coptic;
    }
    else if(icorp->text(1)=="LAT")
    {
        br_f=CBookReader::TlgGreek;
        scr=CTranslit::Latin;
        btscr=CBookTextBrowser::Latin;
    }
    else
    {
        br_f=CBookReader::TlgGreek;
        scr=CTranslit::Greek;
        btscr=CBookTextBrowser::Greek;
    }

    CBookReader * br=new CBookReader(messages,QString(),br_f,btscr);

    switch(btscr)
    {
    case CBookTextBrowser::Coptic :
        {
            QFont f(m_sett()->tlgCopticFont());
            f.setPointSize(m_sett()->tlgCopticFontSize());
            br->setFont(f);
            break;
        }
    case CBookTextBrowser::Greek :
        {
            QFont f(m_sett()->tlgGreekFont());
            f.setPointSize(m_sett()->tlgGreekFontSize());
            br->setFont(f);
            break;
        }
    case CBookTextBrowser::Latin :
        {
            QFont f(m_sett()->latinFont());
            f.setPointSize(m_sett()->latinFontSize());
            br->setFont(f);
            break;
        }
    default:
        break;
    }

    QString txt;
    try{
        IbycusTxtFile ibf(iauth->text(1).toStdString(),icorp->text(2).toStdString());


        ibf.Start(item->text(1).toInt(),item->text(2).toInt());
        do
        {
            QString t(ibf.Text().c_str());

            QString fw(QString(ibf.Id().ToString(IbycusId::fmt_work).c_str())+"\t"+
            CTranslit::betaToUtf(t,scr));

            txt.append(fw+"\n");

            ibf.Next();
        }while(!ibf.eow());
    }
    catch(IbycusException e)
    {
        m_msg()->MsgErr(e.what());
    }

    br->setWindowTitle(tr("TLG/PHI work"));
    br->browser()->append(txt);
    br->browser()->moveCursor(QTextCursor::Start);
    //m_sett()->mdiArea()->addSubWindow(br);
    br->show();
}

void CLibraryWidget::on_treeTLG_itemDoubleClicked(QTreeWidgetItem* item, int )
{
    QTreeWidgetItem * iauth(item->parent());
    if(!iauth)
        return;
    QTreeWidgetItem * icorp(iauth->parent());
    if(!icorp)
        return;

    openTlgBook(item);
}

void CLibraryWidget::on_btHide_clicked()
{
    ui->wdgFind->hide();
    //ui->wdgFind->hide();
    ui->wdgFindFileButton->show();
}

void CLibraryWidget::on_btSearch_clicked()
{
    QString const ct(ui->cmbFindFile->currentText());
    if(!ct.isEmpty())
        on_cmbFindFile_activated(ct);

    CLatCopt::updateHistory(ui->cmbFindFile);
}

void CLibraryWidget::on_btRegExp_clicked()
{
    MRegExpBuilder * rb= new MRegExpBuilder(ui->cmbFindFile->currentText(),ui->cmbFindFile,false);

    rb->setWindowFlags(Qt::Tool|Qt::Popup);
    rb->setWindowIcon(ui->btRegExp->icon());
    rb->move(ui->btRegExp->mapToGlobal(QPoint(0,0)));
    rb->show();
    rb->activateWindow();
}

void CLibraryWidget::findHtmlFile(QTreeWidgetItem * item,QTreeWidget * tree,QRegExp const & r)
{
    if(r.indexIn(item->text(0))!=-1)
    {
        QTreeWidgetItem * ni=new QTreeWidgetItem(0);
        ni->setText(0,item->text(0));
        ni->setIcon(0,item->icon(0));
        ni->setText(1,item->text(3));
        ni->setToolTip(0,item->text(0));
        ni->setToolTip(1,item->text(3));
        tree->addTopLevelItem(ni);
        f_files.append(QPair<QTreeWidgetItem*,QTreeWidgetItem*>(ni,item));
    }

    for(int x=0;x<item->childCount();x++)
    {
        QTreeWidgetItem *i(item->child(x));
        if(i->childCount()>0)
            findHtmlFile(i,tree,r);
        else if(r.indexIn(i->text(0))!=-1)
        {
            QTreeWidgetItem * ni=new QTreeWidgetItem(0);
            ni->setText(0,i->text(0));
            ni->setIcon(0,i->icon(0));
            ni->setText(1,i->text(3));
            ni->setToolTip(0,i->text(0));
            ni->setToolTip(1,i->text(3));
            tree->addTopLevelItem(ni);
            f_files.append(QPair<QTreeWidgetItem*,QTreeWidgetItem*>(ni,i));
        }
    }
}

void CLibraryWidget::on_treeFiles_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *)
{
    if(current)
    {
        USE_CLEAN_WAIT

        QPair<QTreeWidgetItem*,QTreeWidgetItem*> const * fi(0);
        for(int x=0;x<f_files.count();x++)
        {
            QPair<QTreeWidgetItem*,QTreeWidgetItem*> const & i(f_files.at(x));
            if(current==i.first)
            {
                fi=&i;
                break;
            }
        }
        if(fi)
        {
            ui->treeHtmlLib->clearSelection();
            ui->treeHtmlLib->setCurrentItem(fi->second);
            //treeHtmlLib->scrollToItem(i);
            fi->second->setSelected(true);
        }
        else
            ui->treeHtmlLib->clearSelection();
    }
    else
        ui->treeHtmlLib->clearSelection();
}

void CLibraryWidget::on_cmbFindFile_activated(QString ct)
{
    if(!ct.isEmpty())
    {
        USE_CLEAN_WAIT

        ui->treeFiles->clear();
        f_files.clear();
        QRegExp r(ct);
        r.setMinimal(true);
        r.setCaseSensitivity(ui->cbFindCase->isChecked()?Qt::CaseSensitive:Qt::CaseInsensitive);
        rtfd.setRExp(r);
        for(int x=0;x<ui->treeHtmlLib->topLevelItemCount();x++)
        {
            QTreeWidgetItem * i(ui->treeHtmlLib->topLevelItem(x));
            findHtmlFile(i,ui->treeFiles,r);
        }

        //ui->treeFiles->resizeColumnToContents(0);
    }
}

void CLibraryWidget::on_treeFiles_itemDoubleClicked(QTreeWidgetItem* item, int)
{
    if(item)
    {
        QFileInfo name(item->text(1));
        if(!name.isDir())
            openHtmlBook(messages,name.absoluteFilePath(),Auto);
    }
}

void CLibraryWidget::on_treeFiles_customContextMenuRequested(QPoint)
{
    QAction * a;
    popupFind.setActiveAction(a_open2);
    if((a=popupFind.exec(QCursor::pos())))
    {
      if(a==a_open2)
          on_treeFiles_itemDoubleClicked(ui->treeFiles->currentItem(),0);
      else if(a==a_clear2)
      {
          ui->treeFiles->clear();
          f_files.clear();
      }
    }
}

void CLibraryWidget::on_btFindFileCh_clicked()
{
    ui->wdgFind->show();
    ui->wdgFindFileButton->hide();
}

/*QMenu * CLibraryWidget::createEncMenu()
{
    popupEncoding.clear();
    QList<QByteArray> codecs=QTextCodec::availableCodecs();
    for(int x=0;x<codecs.count();x++)
    {
        QAction * a=popupEncoding.addAction(QString(codecs.at(x)),this,SLOT(slot_decodeFileName()));
        a->setData(QVariant::fromValue<QByteArray>(codecs.at(x)));
    }

    return &popupEncoding;
}*/

void CLibraryWidget::slot_decodeFileName()
{
    MLibTreeWidgetItem * i((MLibTreeWidgetItem *)ui->treeHtmlLib->currentItem());
    if(i)
    {
        MLibTreeWidgetItem * pi((MLibTreeWidgetItem *)i->parent());
        QAction * a=(QAction *)this->sender();
        if(a)
        {
            QTextCodec * tc(QTextCodec::codecForName(a->data().toByteArray()));
            if(tc)
            {
                QString newname(tc->toUnicode(i->_raw_name));
                if(pi)
                    newname.prepend(pi->text(3)+QDir::separator());
                MFileInfoItem fip(newname);
                fip._raw_name=i->_raw_name;
                validateHtmlItem(&fip,i,false);
            }
        }
    }
}

// CMIndexItem

CMIndexItem::CMIndexItem(QString const & word,CTranslit::Script script):
    _word(word),
    _script(script),
    _count(1)
{
}

CMIndexItem::CMIndexItem():
    _word(),
    _script(CTranslit::Latin),
    _count(1)
{
}

CMIndexItem::CMIndexItem(CMIndexItem const & other):
    _word(other._word),
    _script(other._script),
    _count(other._count)
{
}

CMIndexItem const & CMIndexItem::operator=(CMIndexItem const & other)
{
    _word=other._word;
    _script=other._script;
    _count=other._count;
    return *this;
}

bool CMIndexItem::operator==(CMIndexItem const & other) const
{
    return QString::compare(_word,other._word,Qt::CaseSensitive)==0&&_script==other._script;
}
